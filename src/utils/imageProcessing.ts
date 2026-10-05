import { Point, QuadCorners, FilterSettings } from '../types/storyboard';

// Declare OpenCV global if loaded
declare global {
  interface Window {
    cv: any;
  }
}

/**
 * Orders 4 points into [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 */
export function orderCorners(pts: Point[]): QuadCorners {
  if (pts.length !== 4) {
    throw new Error('Expected exactly 4 points');
  }

  // Sort by (x + y)
  // Top-left will have smallest sum
  // Bottom-right will have largest sum
  const sumSorted = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const topLeft = sumSorted[0];
  const bottomRight = sumSorted[3];

  // Sort remaining two by (y - x)
  // Top-right will have smallest (y - x)
  // Bottom-left will have largest (y - x)
  const remaining = [sumSorted[1], sumSorted[2]].sort((a, b) => (a.y - a.x) - (b.y - b.x));
  const topRight = remaining[0];
  const bottomLeft = remaining[1];

  return { topLeft, topRight, bottomRight, bottomLeft };
}

/**
 * Calculates a default 16:9 quad centered in the image
 */
export function getDefault16x9Corners(width: number, height: number): QuadCorners {
  const marginRatio = 0.08;
  const availW = width * (1 - marginRatio * 2);
  const availH = height * (1 - marginRatio * 2);

  let targetW = availW;
  let targetH = targetW * (9 / 16);

  if (targetH > availH) {
    targetH = availH;
    targetW = targetH * (16 / 9);
  }

  const cx = width / 2;
  const cy = height / 2;

  const halfW = targetW / 2;
  const halfH = targetH / 2;

  return {
    topLeft: { x: Math.round(cx - halfW), y: Math.round(cy - halfH) },
    topRight: { x: Math.round(cx + halfW), y: Math.round(cy - halfH) },
    bottomRight: { x: Math.round(cx + halfW), y: Math.round(cy + halfH) },
    bottomLeft: { x: Math.round(cx - halfW), y: Math.round(cy + halfH) },
  };
}

/**
 * Automatically detect the 4 corners of the storyboard drawing box.
 * Returns null if no high-confidence 16:9 rectangular frame was found.
 */
export async function detectStoryboardFrame(imageElement: HTMLImageElement | HTMLVideoElement): Promise<QuadCorners | null> {
  const width = 'videoWidth' in imageElement ? imageElement.videoWidth : imageElement.naturalWidth || imageElement.width;
  const height = 'videoHeight' in imageElement ? imageElement.videoHeight : imageElement.naturalHeight || imageElement.height;

  if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
    try {
      const cv = window.cv;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imageElement, 0, 0, width, height);
        const src = cv.imread(canvas);
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 75, 200);

        // Dilate edges slightly to close gaps
        const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
        cv.dilate(edges, edges, kernel);

        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let bestQuad: Point[] | null = null;
        const totalArea = width * height;
        const minArea = totalArea * 0.10; // Aspoň 10% plochy
        const maxAreaAllowed = totalArea * 0.88; // Nesmí to být celý list papíru A4 ani celý stůl

        for (let i = 0; i < contours.size(); ++i) {
          const contour = contours.get(i);
          const area = cv.contourArea(contour);
          if (area > minArea && area < maxAreaAllowed) {
            const peri = cv.arcLength(contour, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.025 * peri, true);

            if (approx.rows === 4 && cv.isContourConvex(approx)) {
              const pts: Point[] = [];
              for (let j = 0; j < 4; j++) {
                pts.push({
                  x: approx.data32S[j * 2],
                  y: approx.data32S[j * 2 + 1]
                });
              }

              const ordered = orderCorners(pts);
              const topW = Math.hypot(ordered.topRight.x - ordered.topLeft.x, ordered.topRight.y - ordered.topLeft.y);
              const botW = Math.hypot(ordered.bottomRight.x - ordered.bottomLeft.x, ordered.bottomRight.y - ordered.bottomLeft.y);
              const leftH = Math.hypot(ordered.bottomLeft.x - ordered.topLeft.x, ordered.bottomLeft.y - ordered.topLeft.y);
              const rightH = Math.hypot(ordered.bottomRight.x - ordered.topRight.x, ordered.bottomRight.y - ordered.topRight.y);

              const avgW = (topW + botW) / 2;
              const avgH = (leftH + rightH) / 2;
              const aspectRatio = avgW / Math.max(1, avgH);

              // KLÍČOVÁ PODMÍNKA: Storyboard rámeček MUSÍ být na šířku 16:9 (poměr 1.45 až 2.05).
              // Pokud je poměr < 1.40, jde o celý list papíru A4 na výšku nebo stůl -> IGNOROVAT!
              const isLandscape16x9 = aspectRatio >= 1.45 && aspectRatio <= 2.05;
              const isReasonablySymmetric = Math.abs(topW - botW) / avgW < 0.25 && Math.abs(leftH - rightH) / avgH < 0.25;

              if (isLandscape16x9 && isReasonablySymmetric && area > maxArea) {
                maxArea = area;
                bestQuad = pts;
              }
            }
            approx.delete();
          }
          contour.delete();
        }

        // Cleanup mats
        src.delete();
        gray.delete();
        blurred.delete();
        edges.delete();
        kernel.delete();
        contours.delete();
        hierarchy.delete();

        if (bestQuad) {
          return orderCorners(bestQuad);
        }
      }
    } catch (err) {
      console.warn('OpenCV auto-detect skipped or error:', err);
    }
  }

  // Pokud nebyl nalezen spolehlivý obrys, vrátit null
  return null;
}

/**
 * Solves a 3x3 homography matrix mapping 4 quad corners to a destination rectangle
 */
function getHomographyMatrix(src: Point[], dst: Point[]): number[] {
  // Solve Ah = b for 8 parameters (h33 = 1)
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    a.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    a.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Solve 8x8 linear system using Gaussian elimination
  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
        maxRow = k;
      }
    }
    const tempA = a[i];
    a[i] = a[maxRow];
    a[maxRow] = tempA;

    const tempB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tempB;

    if (Math.abs(a[i][i]) < 1e-10) {
      // Degenerate matrix, return identity
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    for (let k = i + 1; k < n; k++) {
      const factor = a[k][i] / a[i][i];
      for (let j = i; j < n; j++) {
        a[k][j] -= factor * a[i][j];
      }
      b[k] -= factor * b[i];
    }
  }

  // Back substitution
  const h = new Array(8).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= a[i][j] * h[j];
    }
    h[i] = sum / a[i][i];
  }

  return [...h, 1];
}

/**
 * Inverts a 3x3 matrix
 */
function invert3x3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const invDet = 1 / det;

  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (g * b - a * h) * invDet,
    (a * e - b * d) * invDet,
  ];
}

/**
 * Performs high quality perspective warp of the quadrilateral into a crisp 16:9 rectangle
 */
export function warpPerspectiveCanvas(
  sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  corners: QuadCorners,
  outputWidth = 1280,
  outputHeight = 720
): HTMLCanvasElement {
  // 1. Pokud jde o rovný obdélník 16:9, použít přímý ořez bez jakéhokoliv zkreslení
  const isRectangular = 
    Math.abs(corners.topLeft.y - corners.topRight.y) < 5 &&
    Math.abs(corners.bottomLeft.y - corners.bottomRight.y) < 5 &&
    Math.abs(corners.topLeft.x - corners.bottomLeft.x) < 5 &&
    Math.abs(corners.topRight.x - corners.bottomRight.x) < 5;

  if (isRectangular) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outputWidth;
    outCanvas.height = outputHeight;
    const ctx = outCanvas.getContext('2d')!;
    const sx = Math.max(0, corners.topLeft.x);
    const sy = Math.max(0, corners.topLeft.y);
    const sw = Math.max(1, corners.topRight.x - corners.topLeft.x);
    const sh = Math.max(1, corners.bottomLeft.y - corners.topLeft.y);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvasOrImage, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
    return outCanvas;
  }

  // 2. Pokud jsou rohy posunuté pod úhlem, provést perspektivní narovnání
  if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
    try {
      const cv = window.cv;
      const srcCanvas = document.createElement('canvas');
      const sW = 'videoWidth' in sourceCanvasOrImage ? sourceCanvasOrImage.videoWidth : ('naturalWidth' in sourceCanvasOrImage ? sourceCanvasOrImage.naturalWidth : sourceCanvasOrImage.width);
      const sH = 'videoHeight' in sourceCanvasOrImage ? sourceCanvasOrImage.videoHeight : ('naturalHeight' in sourceCanvasOrImage ? sourceCanvasOrImage.naturalHeight : sourceCanvasOrImage.height);
      srcCanvas.width = sW;
      srcCanvas.height = sH;
      const sCtx = srcCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(sourceCanvasOrImage, 0, 0);
        const src = cv.imread(srcCanvas);
        const dst = new cv.Mat();

        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          corners.topLeft.x, corners.topLeft.y,
          corners.topRight.x, corners.topRight.y,
          corners.bottomRight.x, corners.bottomRight.y,
          corners.bottomLeft.x, corners.bottomLeft.y
        ]);

        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          outputWidth, 0,
          outputWidth, outputHeight,
          0, outputHeight
        ]);

        const M = cv.getPerspectiveTransform(srcTri, dstTri);
        const dsize = new cv.Size(outputWidth, outputHeight);
        cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        const outCanvas = document.createElement('canvas');
        cv.imshow(outCanvas, dst);

        // Cleanup
        src.delete();
        dst.delete();
        srcTri.delete();
        dstTri.delete();
        M.delete();

        return outCanvas;
      }
    } catch (e) {
      console.warn('OpenCV warp failed, using canvas fallback:', e);
    }
  }

  // Pure Canvas Homography Warp (Zero dependency fallback)
  const srcPts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const dstPts = [
    { x: 0, y: 0 },
    { x: outputWidth, y: 0 },
    { x: outputWidth, y: outputHeight },
    { x: 0, y: outputHeight }
  ];

  const H = getHomographyMatrix(srcPts, dstPts);
  const Hinv = invert3x3(H);

  // Read source pixels
  const sW = 'videoWidth' in sourceCanvasOrImage ? sourceCanvasOrImage.videoWidth : ('naturalWidth' in sourceCanvasOrImage ? sourceCanvasOrImage.naturalWidth : sourceCanvasOrImage.width);
  const sH = 'videoHeight' in sourceCanvasOrImage ? sourceCanvasOrImage.videoHeight : ('naturalHeight' in sourceCanvasOrImage ? sourceCanvasOrImage.naturalHeight : sourceCanvasOrImage.height);
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sW;
  tempCanvas.height = sH;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(sourceCanvasOrImage, 0, 0);
  const srcImgData = tempCtx.getImageData(0, 0, sW, sH);
  const srcPixels = srcImgData.data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outputWidth;
  outCanvas.height = outputHeight;
  const outCtx = outCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(outputWidth, outputHeight);
  const outPixels = outImgData.data;

  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = Hinv;

  for (let dy = 0; dy < outputHeight; dy++) {
    for (let dx = 0; dx < outputWidth; dx++) {
      // Map destination pixel (dx, dy) back to source pixel (sx, sy)
      const w = h31 * dx + h32 * dy + h33;
      if (Math.abs(w) > 1e-8) {
        const sx = (h11 * dx + h12 * dy + h13) / w;
        const sy = (h21 * dx + h22 * dy + h23) / w;

        const isx = Math.round(sx);
        const isy = Math.round(sy);

        if (isx >= 0 && isx < sW && isy >= 0 && isy < sH) {
          const srcIdx = (isy * sW + isx) * 4;
          const dstIdx = (dy * outputWidth + dx) * 4;

          outPixels[dstIdx] = srcPixels[srcIdx];
          outPixels[dstIdx + 1] = srcPixels[srcIdx + 1];
          outPixels[dstIdx + 2] = srcPixels[srcIdx + 2];
          outPixels[dstIdx + 3] = 255;
        }
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outCanvas;
}

/**
 * Applies artwork contrast enhancement:
 * - Whitens paper background
 * - Deepens pencil & ink lines
 * - Removes warm ambient shadows
 */
export function applySketchEnhancement(
  canvas: HTMLCanvasElement,
  settings: FilterSettings
): HTMLCanvasElement {
  if (settings.mode === 'original' && settings.contrast === 100 && settings.brightness === 0) {
    return canvas;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const len = data.length;

  const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
  const brightness = settings.brightness;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Grayscale luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (settings.mode === 'contrast-boost') {
      // Graphite/Ink booster:
      // Paper background whitening (above 170 pushed toward 255)
      // Pencil strokes (below 130 darkened)
      let adjusted = lum;
      if (adjusted > 175) {
        adjusted = 255 - (255 - adjusted) * 0.35;
      } else if (adjusted < 120) {
        adjusted = adjusted * 0.75;
      }
      // Apply contrast & brightness
      adjusted = contrastFactor * (adjusted - 128) + 128 + brightness;
      adjusted = Math.min(255, Math.max(0, adjusted));

      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
    } else if (settings.mode === 'bw-ink') {
      // High contrast clean ink
      const threshold = 145 + brightness;
      const val = lum < threshold ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    } else if (settings.mode === 'grayscale') {
      let val = contrastFactor * (lum - 128) + 128 + brightness;
      val = Math.min(255, Math.max(0, val));
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    } else {
      // Original color with contrast & brightness
      r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128 + brightness));
      g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128 + brightness));
      b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128 + brightness));
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
