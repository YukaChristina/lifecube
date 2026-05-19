import { CameraView, type CameraOrientation, type CameraType } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { PhotoOrientation } from '@/features/photo-sets/types';

import { getPhotoOrientationFromSize } from './photo-orientation';
import type { CapturedPhotoPair, DualCameraCaptureStep } from './types';

const FRONT_CAMERA_READY_FALLBACK_MS = 1500;

// ネイティブカメラと同じ4:3にトリミング
async function cropTo4x3(uri: string, width: number, height: number): Promise<string> {
  const isPortrait = height >= width;
  if (isPortrait) {
    const targetHeight = Math.round(width * 4 / 3);
    if (targetHeight >= height) return uri;
    const originY = Math.round((height - targetHeight) / 2);
    const result = await manipulateAsync(
      uri,
      [{ crop: { originX: 0, originY, width, height: targetHeight } }],
      { compress: 1, format: SaveFormat.JPEG },
    );
    return result.uri;
  } else {
    const targetWidth = Math.round(height * 4 / 3);
    if (targetWidth >= width) return uri;
    const originX = Math.round((width - targetWidth) / 2);
    const result = await manipulateAsync(
      uri,
      [{ crop: { originX, originY: 0, width: targetWidth, height } }],
      { compress: 1, format: SaveFormat.JPEG },
    );
    return result.uri;
  }
}

type UseDualCameraCaptureOptions = {
  onCaptured: (photos: CapturedPhotoPair) => void;
  backOnly?: boolean;
  screenOrientationFallback?: PhotoOrientation;
};

type CapturedBackPhoto = {
  uri: string;
  orientation: PhotoOrientation;
};

export function useDualCameraCapture({
  onCaptured,
  backOnly = false,
  screenOrientationFallback = 'portrait',
}: UseDualCameraCaptureOptions) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [captureStep, setCaptureStep] = useState<DualCameraCaptureStep>('idle');
  const [backPhoto, setBackPhoto] = useState<CapturedBackPhoto | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const isCapturingRef = useRef(false);
  const backOnlyRef = useRef(backOnly);
  backOnlyRef.current = backOnly;
  const screenOrientationFallbackRef = useRef(screenOrientationFallback);
  screenOrientationFallbackRef.current = screenOrientationFallback;
  const cameraOrientationRef = useRef<CameraOrientation | null>(null);
  const frontReadyWaitStartedAtRef = useRef<number | null>(null);
  const frontCaptureStartedRef = useRef(false);
  const cameraReadySequenceRef = useRef(0);
  const [cameraReadyEvent, setCameraReadyEvent] = useState<{
    facing: CameraType;
    sequence: number;
    at: number;
  } | null>(null);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  const resetToBackCamera = useCallback(() => {
    setFacing('back');
  }, []);

  const resetCaptureState = useCallback(() => {
    setCaptureStep('idle');
    setBackPhoto(null);
    setIsCapturing(false);
    isCapturingRef.current = false;
    frontReadyWaitStartedAtRef.current = null;
    frontCaptureStartedRef.current = false;
    resetToBackCamera();
  }, [resetToBackCamera]);

  const handleCameraOrientationChange = useCallback((cameraOrientation: CameraOrientation) => {
    cameraOrientationRef.current = cameraOrientation;
  }, []);

  const handleCameraReady = useCallback((readyFacing: CameraType) => {
    const nextSequence = cameraReadySequenceRef.current + 1;
    cameraReadySequenceRef.current = nextSequence;
    setCameraReadyEvent({
      facing: readyFacing,
      sequence: nextSequence,
      at: Date.now(),
    });
  }, []);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturingRef.current) return;
    setIsCapturing(true);
    isCapturingRef.current = true;

    const backResult = await cameraRef.current.takePictureAsync();
    if (!backResult?.uri) {
      resetCaptureState();
      return;
    }

    const backUri = await cropTo4x3(backResult.uri, backResult.width, backResult.height);

    const backOrientation = getPhotoOrientationFromSize(backResult, screenOrientationFallbackRef.current);

    if (backOnlyRef.current) {
      onCaptured({
        back: backUri,
        front: null,
        captureMode: 'backOnly',
        orientation: backOrientation,
      });
      resetCaptureState();
      return;
    }

    setBackPhoto({
      uri: backUri,
      orientation: backOrientation,
    });
    frontCaptureStartedRef.current = false;
    frontReadyWaitStartedAtRef.current = Date.now();
    setFacing('front');
    setCaptureStep('waitingFrontReady');
  }, [onCaptured, resetCaptureState]);

  const captureFrontPhoto = useCallback(async () => {
    if (!backPhoto || frontCaptureStartedRef.current) return;

    if (!cameraRef.current) {
      resetCaptureState();
      return;
    }

    frontCaptureStartedRef.current = true;
    setCaptureStep('capturingFront');

    try {
      const frontResult = await cameraRef.current.takePictureAsync();

      if (frontResult?.uri) {
        const frontUri = await cropTo4x3(frontResult.uri, frontResult.width, frontResult.height);
        onCaptured({
          back: backPhoto.uri,
          front: frontUri,
          captureMode: 'dual',
          orientation: backPhoto.orientation,
        });
      }
    } finally {
      resetCaptureState();
    }
  }, [backPhoto, onCaptured, resetCaptureState]);

  useEffect(() => {
    if (
      captureStep !== 'waitingFrontReady' ||
      !backPhoto ||
      !cameraReadyEvent ||
      cameraReadyEvent.facing !== 'front'
    ) {
      return;
    }

    const waitStartedAt = frontReadyWaitStartedAtRef.current;
    if (waitStartedAt != null && cameraReadyEvent.at < waitStartedAt) return;

    void captureFrontPhoto();
  }, [backPhoto, cameraReadyEvent, captureFrontPhoto, captureStep]);

  useEffect(() => {
    if (captureStep !== 'waitingFrontReady' || !backPhoto) return;

    const timer = setTimeout(() => {
      void captureFrontPhoto();
    }, FRONT_CAMERA_READY_FALLBACK_MS);

    return () => clearTimeout(timer);
  }, [backPhoto, captureFrontPhoto, captureStep]);

  return {
    cameraRef,
    facing,
    isCapturing,
    onCameraOrientationChange: handleCameraOrientationChange,
    onCameraReady: handleCameraReady,
    resetToBackCamera,
    takePhoto,
  };
}
