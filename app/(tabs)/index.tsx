import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { AppState, useWindowDimensions } from 'react-native';

import { CameraLiveView } from '@/components/camera/CameraLiveView';
import { CameraPermissionPrompt } from '@/components/camera/CameraPermissionPrompt';
import { CameraWarmup } from '@/components/camera/CameraWarmup';
import { CapturePreview } from '@/components/camera/CapturePreview';
import { useCameraPermissionFlow } from '@/features/camera/useCameraPermissionFlow';
import { useCapturePreviewSession } from '@/features/camera/useCapturePreviewSession';
import { useVisionCameraCapture } from '@/features/camera/useVisionCameraCapture';
import { useVisionRollingBuffer } from '@/features/camera/useVisionRollingBuffer';
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
    facing,
    isCapturing,
    photoOutput,
    videoOutput,
    takePhoto,
    toggleFacing,
  } = useVisionCameraCapture({
    onCaptured: startPreview,
    screenOrientationFallback,
  });

  const { status: bufferStatus, startBuffering, stopBuffering } = useVisionRollingBuffer(videoOutput);

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
      facing={facing}
      isCapturing={isCapturing}
      voiceUnavailable={voice.unavailable}
      photoOutput={photoOutput}
      videoOutput={videoOutput}
      bufferStatus={bufferStatus}
      onStartBuffer={startBuffering}
      onStopBuffer={stopBuffering}
      onCameraReady={activateCamera}
      onTakePhoto={takePhoto}
      onToggleFacing={toggleFacing}
    />
  );
}
