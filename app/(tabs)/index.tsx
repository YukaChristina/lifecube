import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Share } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { CameraLiveView } from '@/components/camera/CameraLiveView';
import { CameraPermissionPrompt } from '@/components/camera/CameraPermissionPrompt';
import { CameraWarmup } from '@/components/camera/CameraWarmup';
import { CapturePreview } from '@/components/camera/CapturePreview';
import { deleteSavedPhotoSet, savePhotoSet } from '@/features/photo-sets/save-photo-set';
import type { PhotoSet, CompositePattern } from '@/features/photo-sets/types';
import { composePhotos } from '@/utils/composePhoto';
import { loadSettings } from '@/utils/settings';

type Photos = { back: string; front: string };
type CaptureStep = 'idle' | 'capturingFront';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const PREVIEW_CLOSE_DELAY_MS = 4000;

export default function CameraScreen() {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermissionAsked, setCameraPermissionAsked] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [photos, setPhotos] = useState<Photos | null>(null);
  const [composedUri, setComposedUri] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [captureStep, setCaptureStep] = useState<CaptureStep>('idle');
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedPhotoSet, setSavedPhotoSet] = useState<PhotoSet | null>(null);
  const [activePattern, setActivePattern] = useState<CompositePattern>('diagonal');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const isCapturingRef = useRef(false);
  const cameraActiveRef = useRef(false);
  const speechPermissionGrantedRef = useRef(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSessionRef = useRef(0);
  const deleteRequestedSessionsRef = useRef<Set<number>>(new Set());

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
    setFacing('back');
    setCameraActive(true);
  }, [clearPreviewTimer]);

  const schedulePreviewClose = useCallback(() => {
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      resetToCamera();
    }, PREVIEW_CLOSE_DELAY_MS);
  }, [clearPreviewTimer, resetToCamera]);

  useEffect(() => {
    return () => clearPreviewTimer();
  }, [clearPreviewTimer]);

  const requestSpeechPermission = useCallback(async () => {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      speechPermissionGrantedRef.current = granted;
      setVoiceUnavailable(!granted);
      return granted;
    } catch {
      speechPermissionGrantedRef.current = false;
      setVoiceUnavailable(true);
      return false;
    }
  }, []);

  const startVoice = useCallback(async () => {
    if (!speechPermissionGrantedRef.current) {
      const granted = await requestSpeechPermission();
      if (!granted) return;
    }

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'ja-JP',
        interimResults: true,
        continuous: true,
      });
    } catch {
      setVoiceListening(false);
    }
  }, [requestSpeechPermission]);

  const stopVoice = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // The speech module can throw if it is already stopped on some platforms.
    }
    setVoiceListening(false);
  }, []);

  const requestCameraAccess = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted) {
      setCameraActive(false);
      return;
    }

    setFacing('back');
    setCameraActive(true);
    const speechGranted = await requestSpeechPermission();
    if (speechGranted) {
      void startVoice();
    }
  }, [requestPermission, requestSpeechPermission, startVoice]);

  const handlePermissionAction = useCallback(async () => {
    if (permission?.canAskAgain === false) {
      await Linking.openSettings();
      return;
    }

    await requestCameraAccess();
  }, [permission?.canAskAgain, requestCameraAccess]);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    cameraActiveRef.current = cameraActive;
    if (cameraActive) {
      void startVoice();
    } else {
      stopVoice();
    }
  }, [cameraActive, startVoice, stopVoice]);

  useFocusEffect(
    useCallback(() => {
      if (!permission) return undefined;

      if (permission.granted) {
        setFacing('back');
        setCameraActive(true);
      } else {
        setCameraActive(false);
        if (!cameraPermissionAsked && permission.canAskAgain) {
          setCameraPermissionAsked(true);
          void requestCameraAccess();
        }
      }

      return () => {
        setCameraActive(false);
        stopVoice();
      };
    }, [
      cameraPermissionAsked,
      permission,
      requestCameraAccess,
      stopVoice,
    ]),
  );

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

  useSpeechRecognitionEvent('start', () => {
    setVoiceListening(true);
    setVoiceUnavailable(false);
  });

  useSpeechRecognitionEvent('end', () => {
    setVoiceListening(false);
    if (cameraActiveRef.current) {
      setTimeout(() => {
        if (cameraActiveRef.current) void startVoice();
      }, 300);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (text.includes('シャッター') && !isCapturingRef.current) {
      void handleTakePhoto();
    }
  });

  useSpeechRecognitionEvent('error', () => {
    setVoiceListening(false);
    setVoiceUnavailable(true);
  });

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturingRef.current) return;
    setIsCapturing(true);
    isCapturingRef.current = true;

    const backResult = await cameraRef.current.takePictureAsync();
    if (!backResult?.uri) {
      setIsCapturing(false);
      isCapturingRef.current = false;
      return;
    }
    setBackPhotoUri(backResult.uri);
    setFacing('front');
    setCaptureStep('capturingFront');
  };

  useEffect(() => {
    if (captureStep !== 'capturingFront' || !backPhotoUri) return;

    const timer = setTimeout(async () => {
      if (!cameraRef.current) return;
      const frontResult = await cameraRef.current.takePictureAsync();
      if (frontResult?.uri) {
        setPhotos({ back: backPhotoUri, front: frontResult.uri });
        setCameraActive(false);
      }
      setCaptureStep('idle');
      setBackPhotoUri(null);
      setIsCapturing(false);
      isCapturingRef.current = false;
      setFacing('back');
    }, 500);

    return () => clearTimeout(timer);
  }, [captureStep, backPhotoUri]);

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
      voiceListening={voiceListening}
      voiceUnavailable={voiceUnavailable}
      onTakePhoto={handleTakePhoto}
    />
  );
}
