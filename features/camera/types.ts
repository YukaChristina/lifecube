import type { CaptureMode, PhotoOrientation } from '@/features/photo-sets/types';

export type CapturedPhotoPair = {
  back: string;
  front: string | null;
  captureMode: CaptureMode;
  orientation: PhotoOrientation;
};

export type DualCameraCaptureStep = 'idle' | 'capturingFront';

export type VoiceTriggerStatus = {
  listening: boolean;
  unavailable: boolean;
};
