import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { AppState, useWindowDimensions } from 'react-native';

import { CameraLiveView } from '@/components/camera/CameraLiveView';
import { CameraPermissionPrompt } from '@/components/camera/CameraPermissionPrompt';
import { CameraWarmup } from '@/components/camera/CameraWarmup';
import { CandidatePreview } from '@/components/camera/CandidatePreview';
import { CapturePreview } from '@/components/camera/CapturePreview';
import { useCameraPermissionFlow } from '@/features/camera/useCameraPermissionFlow';
import { useCapturePreviewSession } from '@/features/camera/useCapturePreviewSession';
import { useVisionCameraCapture } from '@/features/camera/useVisionCameraCapture';
import { useVisionRollingBuffer } from '@/features/camera/useVisionRollingBuffer';
import { useShutterVoiceTrigger } from '@/features/camera/useShutterVoiceTrigger';
import { extractFramesFromChunks, selectBestFrames, type ExtractedFrame } from '@/utils/selectBestFrames';

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

  const { status: bufferStatus, startBuffering, stopBuffering, firePostTrigger, clearChunks } =
    useVisionRollingBuffer(videoOutput);

  // 候補写真の状態
  const [candidates, setCandidates] = useState<ExtractedFrame[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (previewVisible) stopBuffering();
  }, [previewVisible, stopBuffering]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') stopBuffering();
    });
    return () => sub.remove();
  }, [stopBuffering]);

  // 音声トリガー発火時の処理
  const handleTrigger = useCallback(async () => {
    // バッファが動いていればポストトリガーモードへ
    const postTriggerPromise = firePostTrigger();
    if (postTriggerPromise) {
      console.log('[CameraScreen] ポストトリガー開始');
      const chunks = await postTriggerPromise;
      console.log(`[CameraScreen] 全${chunks.length}チャンク取得`);

      setIsExtracting(true);
      try {
        const frames = await extractFramesFromChunks(chunks);
        const best = selectBestFrames(frames, 3);
        if (best.length > 0) {
          setCandidates(best);
        }
        await clearChunks();
      } catch (e) {
        console.error('[CameraScreen] フレーム抽出失敗:', e);
      } finally {
        setIsExtracting(false);
      }
    } else {
      // バッファ停止中 → 通常の1枚撮影
      await takePhoto();
    }
  }, [firePostTrigger, takePhoto, clearChunks]);

  const voice = useShutterVoiceTrigger({
    active: cameraActive && !previewVisible,
    disabled: isCapturing || bufferStatus.phase === 'post-trigger' || isExtracting,
    onTrigger: handleTrigger,
  });

  // 候補画面を閉じてカメラに戻る
  const handleCandidateDone = useCallback(() => {
    setCandidates([]);
  }, []);

  // 候補画面を表示
  if (candidates.length > 0) {
    return <CandidatePreview candidates={candidates} onDone={handleCandidateDone} />;
  }

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
      isCapturing={isCapturing || isExtracting}
      voiceUnavailable={voice.unavailable}
      photoOutput={photoOutput}
      videoOutput={videoOutput}
      bufferStatus={bufferStatus}
      onStartBuffer={startBuffering}
      onStopBuffer={stopBuffering}
      onCameraReady={activateCamera}
      onTakePhoto={handleTrigger}
      onToggleFacing={toggleFacing}
    />
  );
}
