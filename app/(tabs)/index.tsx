import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Share } from 'react-native';
import { CameraLiveView } from '@/components/camera/CameraLiveView';
import { CameraPermissionPrompt } from '@/components/camera/CameraPermissionPrompt';
import { CameraWarmup } from '@/components/camera/CameraWarmup';
import { CapturePreview } from '@/components/camera/CapturePreview';
import type { CapturedPhotoPair } from '@/features/camera/types';
import { useCameraPermissionFlow } from '@/features/camera/useCameraPermissionFlow';
import { useDualCameraCapture } from '@/features/camera/useDualCameraCapture';
import { useShutterVoiceTrigger } from '@/features/camera/useShutterVoiceTrigger';
import { deleteSavedPhotoSet, savePhotoSet } from '@/features/photo-sets/save-photo-set';
import type { PhotoSet, CompositePattern } from '@/features/photo-sets/types';
import { composePhotos } from '@/utils/composePhoto';
import { loadSettings } from '@/utils/settings';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const PREVIEW_CLOSE_DELAY_MS = 4000;

export default function CameraScreen() {
  const [photos, setPhotos] = useState<CapturedPhotoPair | null>(null);
  const [composedUri, setComposedUri] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedPhotoSet, setSavedPhotoSet] = useState<PhotoSet | null>(null);
  const [activePattern, setActivePattern] = useState<CompositePattern>('diagonal');

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSessionRef = useRef(0);
  const deleteRequestedSessionsRef = useRef<Set<number>>(new Set());

  const {
    activateCamera,
    cameraActive,
    deactivateCamera,
    handlePermissionAction,
    permission,
  } = useCameraPermissionFlow();

  const handleCapturedPhotos = useCallback((nextPhotos: CapturedPhotoPair) => {
    setPhotos(nextPhotos);
  }, []);

  const {
    cameraRef,
    facing,
    isCapturing,
    resetToBackCamera,
    takePhoto,
  } = useDualCameraCapture({
    onCaptured: handleCapturedPhotos,
  });

  const voice = useShutterVoiceTrigger({
    active: cameraActive && !photos,
    disabled: isCapturing,
    onTrigger: takePhoto,
  });

  const clearPreviewTimer = useCallback(() => {
    if (!previewTimerRef.current) return;
    clearTimeout(previewTimerRef.current);
    previewTimerRef.current = null;
  }, []);

  const resetToCamera = useCallback(() => {
    clearPreviewTimer();
    setPhotos(null);
    setComposedUri(null);
    setSaveStatus('idle');
    setSavedPhotoSet(null);
    resetToBackCamera();
    activateCamera();
  }, [activateCamera, clearPreviewTimer, resetToBackCamera]);

  const schedulePreviewClose = useCallback(() => {
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      resetToCamera();
    }, PREVIEW_CLOSE_DELAY_MS);
  }, [clearPreviewTimer, resetToCamera]);

  useEffect(() => {
    return () => clearPreviewTimer();
  }, [clearPreviewTimer]);

  useEffect(() => {
    if (photos) {
      deactivateCamera();
    }
  }, [deactivateCamera, photos]);

  // 2枚撮れたら自動で合成
  useEffect(() => {
    if (!photos) {
      setComposedUri(null);
      return;
    }
    previewSessionRef.current += 1;
    setSaveStatus('idle');
    setSavedPhotoSet(null);
    clearPreviewTimer();
    setIsComposing(true);
    
    loadSettings().then(settings => {
      const pattern = settings.defaultPattern;
      setActivePattern(pattern);
      return composePhotos(photos.front, photos.back, pattern);
    })
      .then(uri => setComposedUri(uri))
      .catch((err) => Alert.alert('エラー', `画像の合成に失敗しました\n${err?.message ?? String(err)}`))
      .finally(() => setIsComposing(false));
  }, [clearPreviewTimer, photos]);

  const saveCurrentPhotoSet = useCallback(async (uri: string, sessionId: number) => {
    if (!photos) {
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    try {
      if (deleteRequestedSessionsRef.current.has(sessionId)) {
        return;
      }

      const photoSet = await savePhotoSet({
        backUri: photos.back,
        frontUri: photos.front,
        composedUri: uri,
        pattern: activePattern,
      });

      if (deleteRequestedSessionsRef.current.has(sessionId)) {
        await deleteSavedPhotoSet(photoSet);
        return;
      }

      if (previewSessionRef.current === sessionId) {
        setSavedPhotoSet(photoSet);
        setSaveStatus('saved');
      }
    } catch {
      if (previewSessionRef.current === sessionId) {
        setSaveStatus('error');
      }
    } finally {
      if (
        previewSessionRef.current === sessionId &&
        !deleteRequestedSessionsRef.current.has(sessionId)
      ) {
        schedulePreviewClose();
      }
    }
  }, [activePattern, photos, schedulePreviewClose]);

  useEffect(() => {
    if (!composedUri || saveStatus !== 'idle') return;
    void saveCurrentPhotoSet(composedUri, previewSessionRef.current);
  }, [composedUri, saveCurrentPhotoSet, saveStatus]);

  const handleShare = async () => {
    const shareUri = savedPhotoSet?.composedLocalUri ?? composedUri;
    if (!shareUri) return;
    clearPreviewTimer();
    await Share.share({
      message: 'LifeCube',
      url: shareUri,
    });
  };

  const deleteLocalUri = async (uri: string | null | undefined) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // Best-effort cleanup. Camera reset should not be blocked by file cleanup.
    }
  };

  const handleDeletePreview = async () => {
    const sessionId = previewSessionRef.current;
    deleteRequestedSessionsRef.current.add(sessionId);
    clearPreviewTimer();

    if (savedPhotoSet) {
      await deleteSavedPhotoSet(savedPhotoSet);
    }

    await Promise.all([
      deleteLocalUri(composedUri),
      deleteLocalUri(photos?.back),
      deleteLocalUri(photos?.front),
    ]);
    resetToCamera();
  };

  // ── プレビュー画面 ────────────────────────────────────────────
  if (photos) {
    return (
      <CapturePreview
        isComposing={isComposing}
        composedUri={composedUri}
        onResetToCamera={resetToCamera}
        onShare={handleShare}
        onDelete={handleDeletePreview}
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
      voiceListening={voice.listening}
      voiceUnavailable={voice.unavailable}
      onTakePhoto={takePhoto}
    />
  );
}
