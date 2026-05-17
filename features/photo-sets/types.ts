export type CompositePattern = 'diagonal' | 'circle' | 'split';
export type CaptureMode = 'dual' | 'backOnly';
export type PhotoOrientation = 'portrait' | 'landscape';

export type FrontImageFocus = {
  x: number;
  y: number;
  scale: number;
};

export const DEFAULT_FRONT_IMAGE_FOCUS: FrontImageFocus = {
  x: 0.5,
  y: 0.5,
  scale: 1,
};

export type PhotoSet = {
  id: string;
  createdAt: number;
  captureMode: CaptureMode;
  orientation: PhotoOrientation;
  backLocalUri: string | null;
  frontLocalUri: string | null;
  composedLocalUri: string;
  composedAssetId: string | null;
  pattern: CompositePattern | null;
  composedWidth: number;
  composedHeight: number;
  frontImageFocusX: number | null;
  frontImageFocusY: number | null;
  frontImageScale: number | null;
  deletedAt: number | null;
};

export type SavePhotoSetInput = {
  backUri: string;
  frontUri: string | null;
  composedUri: string;
  captureMode: CaptureMode;
  orientation: PhotoOrientation;
  pattern: CompositePattern | null;
  frontImageFocus: FrontImageFocus | null;
};

export type PhotoSetRow = {
  id: string;
  created_at: number;
  capture_mode: CaptureMode;
  orientation: PhotoOrientation;
  back_local_uri: string | null;
  front_local_uri: string | null;
  composed_local_uri: string;
  composed_asset_id: string | null;
  pattern: CompositePattern | null;
  composed_width: number;
  composed_height: number;
  front_image_focus_x: number | null;
  front_image_focus_y: number | null;
  front_image_scale: number | null;
  deleted_at: number | null;
};
