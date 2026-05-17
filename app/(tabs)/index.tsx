import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { CameraLiveView } from '@/components/camera/CameraLiveView';
import { CameraPermissionPrompt } from '@/components/camera/CameraPermissionPrompt';
import { CameraWarmup } from '@/components/camera/CameraWarmup';
import { CapturePreview } from '@/components/camera/CapturePreview';
import { useCameraPermissionFlow } from '@/features/camera/useCameraPermissionFlow';
import { useCapturePreviewSession } from '@/features/camera/useCapturePreviewSession';
import { useDualCameraCapture } from '@/features/camera/useDualCameraCapture';
import { useShutterVoiceTrigger } from '@/features/camera/useShutterVoiceTrigger';
import { loadSettings, saveSettings } from '@/utils/settings';

export default function CameraScreen() {
  const { width, height } = useWindowDimensions();
  const orientation = width > height ? 'landscape' : 'portrait';

  const [backOnly, setBackOnly] = useState(false);

  useEffect(() => {
    void activateKeepAwakeAsync();
    return () => { void deactivateKeepAwake(); };
  }, []);

  useEffect(() => {
    loadSettings().then(s => setBackOnly(s.cameraMode === 'back-only'));
  }, []);

  const toggleCameraMode = useCallback(async () => {
    const next = !backOnly;
    setBackOnly(next);
    await saveSettings({ cameraMode: next ? 'back-only' : 'dual' });
  }, [backOnly]);

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
    returnToCamera,
    share,
    startPreview,
    visible: previewVisible,
  } = useCapturePreviewSession({
    onPreviewStart: deactivateCamera,
    onReturnToCamera: activateCamera,
    backOnly,
  });

  const {
    cameraRef,
    facing,
    isCapturing,
    takePhoto,
  } = useDualCameraCapture({
    onCaptured: startPreview,
    backOnly,
    orientation,
  });

  const voice = useShutterVoiceTrigger({
    active: cameraActive && !previewVisible,
    disabled: isCapturing,
    onTrigger: takePhoto,
  });

  // ── プレビュー画面 ────────────────────────────────────────────
  if (previewVisible) {
    return (
      <CapturePreview
        isComposing={isComposing}
        composedUri={composedUri}
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
      backOnly={backOnly}
      onTakePhoto={takePhoto}
      onToggleCameraMode={toggleCameraMode}
    />
  );
}
