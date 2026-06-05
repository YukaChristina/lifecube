import { useCallback, useState } from 'react';
import {
  usePhotoOutput,
  useVideoOutput,
} from 'react-native-vision-camera';

import type { PhotoOrientation } from '@/features/photo-sets/types';

import type { CapturedPhotoPair } from './types';

type Options = {
  onCaptured: (photos: CapturedPhotoPair) => void;
  screenOrientationFallback?: PhotoOrientation;
};

export function useVisionCameraCapture({
  onCaptured,
  screenOrientationFallback = 'portrait',
}: Options) {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [isCapturing, setIsCapturing] = useState(false);

  const photoOutput = usePhotoOutput({ quality: 0.85 });
  const videoOutput = useVideoOutput({ enableAudio: false });

  const takePhoto = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await photoOutput.capturePhoto({}, {});
      const filePath = await photo.saveToTemporaryFileAsync();
      photo.dispose();
      onCaptured({
        back: `file://${filePath}`,
        front: null,
        captureMode: 'backOnly',
        orientation: screenOrientationFallback,
      });
    } catch (e) {
      console.error('[VisionCapture] takePhoto failed:', e);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCaptured, photoOutput, screenOrientationFallback]);

  const toggleFacing = useCallback(() => {
    setFacing(f => (f === 'front' ? 'back' : 'front'));
  }, []);

  return {
    facing,
    isCapturing,
    photoOutput,
    videoOutput,
    takePhoto,
    toggleFacing,
  };
}
