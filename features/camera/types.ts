export type CapturedPhotoPair = {
  back: string;
  front: string;
};

export type DualCameraCaptureStep = 'idle' | 'capturingFront';

export type VoiceTriggerStatus = {
  listening: boolean;
  unavailable: boolean;
};
