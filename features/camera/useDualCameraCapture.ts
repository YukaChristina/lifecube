import { CameraView, type CameraType } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CapturedPhotoPair, DualCameraCaptureStep } from './types';

type UseDualCameraCaptureOptions = {
  onCaptured: (photos: CapturedPhotoPair) => void;
  backOnly?: boolean;
  orientation?: 'portrait' | 'landscape';
};

export function useDualCameraCapture({ onCaptured, backOnly = false, orientation = 'portrait' }: UseDualCameraCaptureOptions) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [captureStep, setCaptureStep] = useState<DualCameraCaptureStep>('idle');
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const isCapturingRef = useRef(false);
  const backOnlyRef = useRef(backOnly);
  backOnlyRef.current = backOnly;
  const orientationRef = useRef(orientation);
  orientationRef.current = orientation;

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  const resetToBackCamera = useCallback(() => {
    setFacing('back');
  }, []);

  const resetCaptureState = useCallback(() => {
    setCaptureStep('idle');
    setBackPhotoUri(null);
    setIsCapturing(false);
    isCapturingRef.current = false;
    resetToBackCamera();
  }, [resetToBackCamera]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturingRef.current) return;
    setIsCapturing(true);
    isCapturingRef.current = true;

    const backResult = await cameraRef.current.takePictureAsync();
    if (!backResult?.uri) {
      resetCaptureState();
      return;
    }

    if (backOnlyRef.current) {
      onCaptured({
        back: backResult.uri,
        front: null,
        captureMode: 'backOnly',
        orientation: orientationRef.current,
      });
      resetCaptureState();
      return;
    }

    setBackPhotoUri(backResult.uri);
    setFacing('front');
    setCaptureStep('capturingFront');
  }, [onCaptured, resetCaptureState]);

  useEffect(() => {
    if (captureStep !== 'capturingFront' || !backPhotoUri) return;

    const timer = setTimeout(async () => {
      if (!cameraRef.current) {
        resetCaptureState();
        return;
      }

      const frontResult = await cameraRef.current.takePictureAsync();
      if (frontResult?.uri) {
        onCaptured({
          back: backPhotoUri,
          front: frontResult.uri,
          captureMode: 'dual',
          orientation: orientationRef.current,
        });
      }

      resetCaptureState();
    }, 500);

    return () => clearTimeout(timer);
  }, [backPhotoUri, captureStep, onCaptured, resetCaptureState]);

  return {
    cameraRef,
    facing,
    isCapturing,
    resetToBackCamera,
    takePhoto,
  };
}
