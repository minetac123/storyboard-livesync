# Storyboard LiveSync & Auto-Crop

An end-to-end dual-device web application designed for cinematic desktop storyboard editing paired with zero-latency mobile camera capture, optical corner detection, perspective warping, and auto-contrast enhancement.

---

## 🎬 Core Architecture & Workflow

```
       [PRINTABLE A4 TEMPLATE]
      ┌───────────────────────┐
      │  ┌─────────┐   [QR]   │
      │  │  16:9   │   Scan   │
      │  │ Sketch  │   Link   │
      │  └─────────┘          │
      └───────────────────────┘
                 │
                 ▼ (Phone Camera Scan)
    [MOBILE WIRELESS SCANNER]
  • 16:9 On-screen Framing Guide
  • Computer Vision Edge Detection
  • Interactive 4-Corner Homography Warp
  • Graphite & Ink Contrast Booster
  • Instant "Send to PC"
                 │
                 ▼ (Zero-Latency WebSockets)
    [DESKTOP WORKSTATION]
  • Room Session System (Zero Login)
  • Real-Time Flash & Web Audio Chime Cue
  • Editable Scene, Shot, Lens & Script
  • Full-Screen Presentation Reel Mode
  • One-Click Film School PDF Portfolio
```

---

## 🚀 Key Features

### 1. Desktop Workstation (`/`)
- **Zero-Login Room Sessions**: Automatic memorable Room IDs (e.g. `ROOM-7X2K`) shareable via URL.
- **Cinematic Digital Storyboard Board**:
  - 16:9 aspect ratio artwork slots with instant incoming sync animations.
  - Editable metadata per card: `Scene #`, `Shot #`, `Camera / Lens Type`, `Camera Movement`, `Action & Staging`, `Dialogue / Audio / SFX`.
  - Reorder, duplicate, add, and delete panels.
  - High-res Lightbox with contrast and graphite filters.
  - Multi-view options: **Grid View**, **Detailed List View**, and **Full-Screen Presentation Reel** with keyboard arrows and audio/dialogue teleprompter.
- **Audio-Visual Cues**:
  - Web Audio API synthesizer chimes when an incoming sketch arrives.
  - Glowing emerald border flash on the updated card.
- **Printable A4 Template Generator**:
  - Exports a clean A4 PDF (6 or 4 panels per page).
  - Each panel includes:
    1. A 16:9 drawing frame with solid black L-corner registration targets.
    2. Lined notes area (`CAMERA`, `ACTION`, `AUDIO`).
    3. A unique QR code linking directly to the mobile scanner for that panel: `http://[LAN_IP]:3000/scan?room=[ROOM_ID]&panel=[PANEL_ID]`.
- **Film School Presentation PDF Export**:
  - One-click compilation to an academic/festival-ready landscape PDF.
  - Includes a director cover slate, production specifications (Aspect ratio, total frames, date), high-resolution artwork, and formatted script notes.
- **Built-in Mobile Camera Simulator**:
  - Allows full testing of the mobile experience directly within a smartphone frame in the desktop browser.

### 2. Mobile Scanner Client (`/scan`)
- **Instant Pair via QR**: Scanning any panel's QR code opens directly into the targeted panel view without typing.
- **16:9 Framing Viewfinder**: On-screen dashed guide with corner target brackets.
- **Edge Detection & Homography Perspective Warp**:
  - Automatically identifies the rectangular 16:9 boundary (via OpenCV.js or HTML5 Canvas fallback).
  - 4 interactive touch handles to fine-tune corner pins.
  - Projective homography transformation rectifies tilted paper to a razor-sharp 16:9 canvas.
- **Artwork Contrast Enhancement**:
  - **Graphite Boost**: Whitens paper and darkens pencil strokes.
  - **Ink B&W**: Clean high-contrast thresholding for ink drawings.
  - **Grayscale** & **Original Color**.
- **Real-Time Transmission**:
  - "Send to PC" transmits the sketch over WebSockets directly into the active desktop session.
  - Confetti confirmation, success audio chime, and "Scan Next Panel" auto-advance.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide Icons, Canvas-Confetti
- **Real-Time LiveSync**: Node.js HTTP + WebSocket Server (`ws`) with automatic LAN IPv4 resolution and REST fallback
- **Computer Vision**: OpenCV.js WebAssembly + Pure JavaScript Homography Matrix solver & Canvas 2D filters
- **Document & Print Generation**: `jspdf` and `qrcode`
- **Audio Synthesis**: Native Web Audio API (zero audio file dependencies)

---

## 🏃‍♂️ How to Run

1. Navigate to the project directory:
   ```bash
   cd storyboard-livesync
   ```

2. Start the LiveSync server:
   ```bash
   npm run dev
   # or: node server.js
   ```

3. Open in your browser:
   - **Desktop Workstation**: [http://localhost:3000](http://localhost:3000)
   - **Mobile Devices (Same Wi-Fi)**: [http://192.168.0.155:3000](http://192.168.0.155:3000) (or scan the on-screen QR code)
