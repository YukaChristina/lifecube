import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

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

  const { status: bufferStatus, startBuffering, stopBuffering } = useRollingBuffer(cameraRef);

  const voice = useShutterVoiceTrigger({
    active: cameraActive && !previewVisible,
    disabled: isCapturing,
    onTrigger: takePhoto,
  });

  // プレビュー中はバッファ停止
  useEffect(() => {
    if (previewVisible) stopBuffering();
  }, [previewVisible, stopBuffering]);

  // onCameraReady 後にバッファ開始（ネイティブ側の準備完了を少し待つ）
  const handleCameraReady = (f: Parameters<typeof onCameraReady>[0]) => {
    onCameraReady(f);
    setTimeout(() => {
      void startBuffering();
    }, 1500);
  };

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
      onCameraOrientationChange={onCameraOrientationChange}
      onCameraReady={handleCameraReady}
      onTakePhoto={takePhoto}
      onToggleFacing={toggleFacing}
    />
  );
}
