export type CapturedPhotoPair = {
  back: string;
  front: string;
  orientation: 'portrait' | 'landscape';
};

export type DualCameraCaptureStep = 'idle' | 'capturingFront';

export type VoiceTriggerStatus = {
  listening: boolean;
  unavailable: boolean;
};
