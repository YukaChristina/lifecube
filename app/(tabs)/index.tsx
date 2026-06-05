import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef } from 'react';
import { AppState, useWindowDimensions } from 'react-native';

import { CameraLiveView } from '@/components/camera/CameraLiveView';
import { CameraPermissionPrompt } from '@/components/camera/CameraPermissionPrompt';
import { CameraWarmup } from '@/components/camera/CameraWarmup';
import { CapturePreview } from '@/components/camera/CapturePreview';
import { useCameraPermissionFlow } from '@/features/camera/useCameraPermissionFlow';
import { useCapturePreviewSession } from '@/features/camera/useCapturePreviewSession';
import { useDualCameraCapture } from '@/features/camera/useDualCameraCapture';
import { useRollingBuffer } from '@/features/camera/useRollingBuffer';
import { useShutterVoiceTrigger } from '@/features/camera/useShutterVoiceTrigger';

export default function CameraScreen() {
  const { width, height } = useWindowDimensions();
  const screenOrientationFallback = width > height ? 'landscape' : 'portrait';

  useEffect(() => {
    void activateKeepAwakeAsync();
    return () => { void deactivateKeepAwake(); };
  }, []);

  const {
    activateCamera,
    cameraActive,
    deactivateCamera,
    handlePermissionAction,
    permission,
  } = useCameraPermissionFlow();

  const {
    closeScheduledAt,
    composedUri,
    deletePreview,
    isComposing,
    orientation: previewOrientation,
    returnToCamera,
    share,
    startPreview,
    visible: previewVisible,
  } = useCapturePreviewSession({
    onPreviewStart: deactivateCamera,
    onReturnToCamera: activateCamera,
  });

  const {
    cameraRef,
    facing,
    isCapturing,
    onCameraOrientationChange,
    onCameraReady,
    takePhoto,
    toggleFacing,
  } = useDualCameraCapture({
    onCaptured: startPreview,
    backOnly: true,
    screenOrientationFallback,
  });

  const isCapturingRef = useRef(isCapturing);
  useEffect(() => { isCapturingRef.current = isCapturing; }, [isCapturing]);

  const { status: bufferStatus, startBuffering, stopBuffering } = useRollingBuffer(cameraRef, isCapturingRef);

  useEffect(() => {
    if (previewVisible) stopBuffering();
  }, [previewVisible, stopBuffering]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') stopBuffering();
    });
    return () => sub.remove();
  }, [stopBuffering]);

  const voice = useShutterVoiceTrigger({
    active: cameraActive && !previewVisible,
    disabled: isCapturing,
    onTrigger: takePhoto,
  });

  if (previewVisible) {
    return (
      <CapturePreview
        isComposing={isComposing}
        composedUri={composedUri}
        orientation={previewOrientation}
        closeScheduledAt={closeScheduledAt}
        onResetToCamera={returnToCamera}
        onShare={share}
        onDelete={deletePreview}
      />
    );
  }

  if (!permission) {
    return <CameraWarmup />;
  }

  if (!permission.granted) {
    return (
      <CameraPermissionPrompt
        blocked={permission.canAskAgain === false}
        onPressAction={handlePermissionAction}
      />
    );
  }

  if (!cameraActive) {
    return <CameraWarmup />;
  }

  return (
    <CameraLiveView
      cameraRef={cameraRef}
      facing={facing}
      isCapturing={isCapturing}
      voiceUnavailable={voice.unavailable}
      bufferStatus={bufferStatus}
      onStartBuffer={startBuffering}
      onStopBuffer={stopBuffering}
      onCameraOrientationChange={onCameraOrientationChange}
      onCameraReady={onCameraReady}
      onTakePhoto={takePhoto}
      onToggleFacing={toggleFacing}
    />
  );
}
