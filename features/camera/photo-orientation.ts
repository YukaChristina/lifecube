import type { CameraOrientation } from 'expo-camera';

import type { PhotoOrientation } from '@/features/photo-sets/types';

type CapturedPhotoSize = {
  width?: number | null;
  height?: number | null;
};

export function getPhotoOrientationFromSize(
  size: CapturedPhotoSize,
  fallback: PhotoOrientation = 'portrait',
): PhotoOrientation {
  const { width, height } = size;

  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width === height
  ) {
    return fallback;
  }

  return width > height ? 'landscape' : 'portrait';
}

export function getPhotoOrientationFromCameraOrientation(
  cameraOrientation: CameraOrientation | null | undefined,
) {
  if (
    cameraOrientation === 'landscapeLeft' ||
    cameraOrientation === 'landscapeRight'
  ) {
    return 'landscape' satisfies PhotoOrientation;
  }

  if (
    cameraOrientation === 'portrait' ||
    cameraOrientation === 'portraitUpsideDown'
  ) {
    return 'portrait' satisfies PhotoOrientation;
  }

  return null;
}
