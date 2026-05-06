import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { deleteSavedPhotoSet, savePhotoSet } from '@/features/photo-sets/save-photo-set';
import type { PhotoSet, CompositePattern } from '@/features/photo-sets/types';
import { composePhotos } from '@/utils/composePhoto';
import { loadSettings } from '@/utils/settings';

type Photos = { back: string; front: string };
type CaptureStep = 'idle' | 'capturingFront';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const PREVIEW_CLOSE_DELAY_MS = 4000;

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
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
  }, [photos, schedulePreviewClose]);

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

  const renderPermissionPrompt = () => {
    const blocked = permission?.canAskAgain === false;

    return (
      <View style={styles.permissionContainer}>
        <View style={styles.backdropFrame}>
          <View style={styles.backdropCircle} />
          <View style={styles.backdropLine} />
          <View style={[styles.backdropLine, styles.backdropLineShort]} />
        </View>

        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>
            {blocked ? '撮影には許可が必要です' : 'カメラとマイクを使います'}
          </Text>
          <Text style={styles.permissionText}>
            {blocked
              ? '設定からカメラとマイクの許可を変更できます'
              : '撮影のために許可してください'}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handlePermissionAction}>
            <Text style={styles.permissionButtonText}>
              {blocked ? '設定を開く' : '許可を確認する'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCameraWarmup = () => (
    <View style={styles.warmupContainer}>
      <View style={styles.backdropFrame}>
        <View style={styles.backdropCircle} />
        <View style={styles.backdropLine} />
        <View style={[styles.backdropLine, styles.backdropLineShort]} />
      </View>
    </View>
  );

  // ── プレビュー画面 ────────────────────────────────────────────
  if (photos) {
    return (
      <View style={styles.previewContainer}>
        {isComposing ? (
          <View style={styles.composingBox}>
            <ActivityIndicator size="large" color="#F3B8C8" />
            <Text style={styles.composingText}>画像を合成中...</Text>
          </View>
        ) : composedUri ? (
          <>
            <Image source={{ uri: composedUri }} style={styles.previewImage} resizeMode="cover" />
            <Pressable style={styles.previewTapLayer} onPress={resetToCamera} />

            <View style={[
              styles.previewInstructionBar,
              { paddingTop: Math.max(insets.top, 18) + 10 },
            ]} pointerEvents="none">
              <Text style={styles.previewInstructionText}>画面をタップでカメラへ戻る</Text>
            </View>

            <View style={[
              styles.previewActions,
              {
                right: insets.right + 18,
                bottom: Math.max(insets.bottom, 18) + 32,
              },
            ]}>
              <TouchableOpacity style={styles.previewActionButton} onPress={handleShare}>
                <Text style={styles.previewActionText}>Instagramで共有</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.previewActionButton} onPress={handleDeletePreview}>
                <Text style={styles.previewActionText}>削除する</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>
    );
  }

  if (!permission) {
    return renderCameraWarmup();
  }

  if (!permission.granted) {
    return renderPermissionPrompt();
  }

  if (!cameraActive) {
    return renderCameraWarmup();
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

      <View style={[styles.voiceIndicator, { top: Math.max(insets.top, 16) + 8 }]}>
        <View style={[styles.voiceDot, voiceListening && styles.voiceDotActive]} />
        <Text style={styles.voiceLabel}>
          {voiceUnavailable ? '音声の許可が必要です' : voiceListening ? '音声認識中' : '音声待機中'}
        </Text>
      </View>

      {isCapturing && (
        <View style={styles.capturingOverlay} pointerEvents="none">
          <View style={styles.capturingCard}>
            <Text style={styles.capturingTitle}>撮影切り替え中です</Text>
            <Text style={styles.capturingText}>カメラを動かさないでください</Text>
          </View>
        </View>
      )}

      <View style={[
        styles.cameraControls,
        {
          paddingBottom: Math.max(insets.bottom, 20) + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        },
      ]}>
        <View style={styles.controlSpacer} />
        <TouchableOpacity
          style={[styles.shutterButton, isCapturing && styles.shutterDisabled]}
          onPress={handleTakePhoto}
          disabled={isCapturing}>
          <Text style={styles.shutterText}>撮影</Text>
        </TouchableOpacity>
        <View style={styles.controlSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F4F6',
    paddingHorizontal: 28,
  },
  warmupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F4F6',
    paddingHorizontal: 28,
  },
  backdropFrame: {
    position: 'absolute',
    top: 72,
    left: 28,
    right: 28,
    bottom: 88,
    borderWidth: 1,
    borderColor: 'rgba(243, 184, 200, 0.38)',
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
    borderRadius: 28,
  },
  backdropCircle: {
    position: 'absolute',
    top: 28,
    right: 28,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(199, 230, 220, 0.72)',
  },
  backdropLine: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 64,
    height: 1,
    backgroundColor: 'rgba(200, 223, 242, 0.52)',
  },
  backdropLineShort: {
    left: 72,
    right: 72,
    bottom: 44,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 184, 200, 0.70)',
    backgroundColor: 'rgba(255, 250, 252, 0.78)',
  },
  permissionTitle: {
    color: '#4D4650',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    color: '#6E6670',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#F3B8C8',
  },
  permissionButtonText: {
    color: '#4D4650',
    fontSize: 14,
    fontWeight: '700',
  },
  voiceIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,250,252,0.72)',
    borderColor: 'rgba(243,184,200,0.42)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D7CED9',
  },
  voiceDotActive: {
    backgroundColor: '#A8D8CC',
  },
  voiceLabel: {
    color: '#4D4650',
    fontSize: 12,
    fontWeight: '600',
  },
  capturingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  capturingCard: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(243,184,200,0.70)',
    backgroundColor: 'rgba(255,250,252,0.72)',
  },
  capturingTitle: {
    color: '#4D4650',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  capturingText: {
    color: '#4D4650',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    backgroundColor: 'rgba(255,250,252,0.28)',
  },
  controlSpacer: {
    width: 64,
  },
  shutterButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.36)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterDisabled: {
    opacity: 0.52,
  },
  shutterText: {
    color: '#4D4650',
    fontSize: 15,
    fontWeight: '800',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  composingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  composingText: {
    fontSize: 16,
    color: '#555',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  previewTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  previewInstructionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
    paddingBottom: 10,
    backgroundColor: 'rgba(255,250,252,0.24)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,250,252,0.42)',
  },
  previewInstructionText: {
    color: 'rgba(77,70,80,0.82)',
    fontSize: 13,
    fontWeight: '700',
  },
  previewActions: {
    position: 'absolute',
    zIndex: 3,
    alignItems: 'stretch',
    gap: 18,
  },
  previewActionButton: {
    minWidth: 154,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,184,200,0.70)',
    backgroundColor: 'rgba(255,250,252,0.76)',
  },
  previewActionText: {
    color: '#4D4650',
    fontSize: 14,
    fontWeight: '800',
  },
});
