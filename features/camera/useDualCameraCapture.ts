import { CameraView, type CameraOrientation, type CameraType } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { PhotoOrientation } from '@/features/photo-sets/types';

import { resolvePhotoOrientation } from './photo-orientation';
import type { CapturedPhotoPair, DualCameraCaptureStep } from './types';

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
    resetToBackCamera();
  }, [resetToBackCamera]);

  const handleCameraOrientationChange = useCallback((cameraOrientation: CameraOrientation) => {
    cameraOrientationRef.current = cameraOrientation;
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

    const backOrientation = resolvePhotoOrientation({
      cameraOrientation: cameraOrientationRef.current,
      photoSize: backResult,
      screenOrientationFallback: screenOrientationFallbackRef.current,
    });

    if (backOnlyRef.current) {
      onCaptured({
        back: backResult.uri,
        front: null,
        captureMode: 'backOnly',
        orientation: backOrientation,
      });
      resetCaptureState();
      return;
    }

    setBackPhoto({
      uri: backResult.uri,
      orientation: backOrientation,
    });
    setFacing('front');
    setCaptureStep('capturingFront');
  }, [onCaptured, resetCaptureState]);

  useEffect(() => {
    if (captureStep !== 'capturingFront' || !backPhoto) return;

    const timer = setTimeout(async () => {
      if (!cameraRef.current) {
        resetCaptureState();
        return;
      }

      const frontResult = await cameraRef.current.takePictureAsync();
      if (frontResult?.uri) {
        onCaptured({
          back: backPhoto.uri,
          front: frontResult.uri,
          captureMode: 'dual',
          orientation: backPhoto.orientation,
        });
      }

      resetCaptureState();
    }, 500);

    return () => clearTimeout(timer);
  }, [backPhoto, captureStep, onCaptured, resetCaptureState]);

  return {
    cameraRef,
    facing,
    isCapturing,
    onCameraOrientationChange: handleCameraOrientationChange,
    resetToBackCamera,
    takePhoto,
  };
}
