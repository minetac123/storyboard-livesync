export interface StoryboardPanel {
  id: string;
  order: number;
  scene: string;
  shot: string;
  cameraType: string;
  cameraMovement: string;
  action: string;
  dialogue: string;
  imageUrl: string | null;
  updatedAt: number;
  aspectRatio: string;
  capturedViaMobile?: boolean;
}

export interface StoryboardProject {
  id: string;
  title: string;
  director: string;
  aspectRatio: string;
  date: string;
  panels: StoryboardPanel[];
}

export interface Point {
  x: number;
  y: number;
}

export interface QuadCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface FilterSettings {
  mode: 'contrast-boost' | 'bw-ink' | 'grayscale' | 'original';
  contrast: number; // 0 to 200 (100 is neutral)
  brightness: number; // -50 to 50 (0 is neutral)
}
