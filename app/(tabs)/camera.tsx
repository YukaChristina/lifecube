import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { composePhotos } from '@/utils/composePhoto';

type Photos = { back: string; front: string };
type CaptureStep = 'idle' | 'capturingFront';

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [cameraActive, setCameraActive] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [photos, setPhotos] = useState<Photos | null>(null);
  const [composedUri, setComposedUri] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [captureStep, setCaptureStep] = useState<CaptureStep>('idle');
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const isCapturingRef = useRef(false);
  const cameraActiveRef = useRef(false);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    cameraActiveRef.current = cameraActive;
    if (cameraActive) {
      startVoice();
    } else {
      stopVoice();
    }
  }, [cameraActive]);

  // 2枚撮れたら自動で合成
  useEffect(() => {
    if (!photos) { setComposedUri(null); return; }
    setIsComposing(true);
    composePhotos(photos.front, photos.back)
      .then(uri => setComposedUri(uri))
      .catch((err) => Alert.alert('エラー', `画像の合成に失敗しました\n${err?.message ?? String(err)}`))
      .finally(() => setIsComposing(false));
  }, [photos]);

  // ── 音声認識イベント ──────────────────────────────────────────
  useSpeechRecognitionEvent('start', () => setVoiceListening(true));

  useSpeechRecognitionEvent('end', () => {
    setVoiceListening(false);
    if (cameraActiveRef.current) {
      setTimeout(() => {
        if (cameraActiveRef.current) startVoice();
      }, 300);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (text.includes('シャッター') && !isCapturingRef.current) {
      handleTakePhoto();
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useSpeechRecognitionEvent('error', (_event) => {
    setVoiceListening(false);
  });
  // ─────────────────────────────────────────────────────────────

  const startVoice = () => {
    ExpoSpeechRecognitionModule.start({
      lang: 'ja-JP',
      interimResults: true,
      continuous: true,
    });
  };

  const stopVoice = () => {
    ExpoSpeechRecognitionModule.stop();
    setVoiceListening(false);
  };

  const handleStartCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    setFacing('back');
    setCameraActive(true);
  };

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

  const handleSave = async () => {
    if (!composedUri) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', '設定から写真へのアクセスを許可してください');
      return;
    }
    await MediaLibrary.saveToLibraryAsync(composedUri);
    Alert.alert('保存しました', '写真アプリに保存されました', [
      { text: 'OK', onPress: () => { setPhotos(null); setComposedUri(null); } },
    ]);
  };

  const handleRetake = () => {
    setPhotos(null);
    setComposedUri(null);
    setCameraActive(true);
  };

  // ── プレビュー画面 ────────────────────────────────────────────
  if (photos) {
    return (
      <View style={styles.previewContainer}>
        <Text style={styles.title}>撮影結果</Text>

        {isComposing ? (
          <View style={styles.composingBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.composingText}>画像を合成中...</Text>
          </View>
        ) : composedUri ? (
          <Image source={{ uri: composedUri }} style={styles.composedImage} />
        ) : null}

        <View style={styles.previewButtons}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Text style={styles.retakeText}>撮り直す</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, (!composedUri || isComposing) && styles.disabledButton]}
            onPress={handleSave}
            disabled={!composedUri || isComposing}>
            <Text style={styles.saveText}>保存する</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── カメラ画面 ────────────────────────────────────────────────
  if (cameraActive) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

        <View style={[styles.voiceIndicator, { top: Math.max(insets.top, 16) + 8 }]}>
          <View style={[styles.voiceDot, voiceListening && styles.voiceDotActive]} />
          <Text style={styles.voiceLabel}>
            {voiceListening ? '音声認識中' : '音声待機中'}
          </Text>
        </View>

        {isCapturing && (
          <View style={styles.capturingOverlay}>
            <Text style={styles.capturingText}>
              {captureStep === 'capturingFront' ? '内カメラに切替中...' : '撮影中...'}
            </Text>
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
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setCameraActive(false)}
            disabled={isCapturing}>
            <Text style={styles.closeText}>閉じる</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shutterButton, isCapturing && styles.shutterDisabled]}
            onPress={handleTakePhoto}
            disabled={isCapturing}>
            <Text style={styles.shutterText}>撮影</Text>
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
      </View>
    );
  }

  // ── トップ画面 ────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>カメラ</Text>
      <Text style={styles.hint}>「シャッター」と言うと自動撮影します</Text>
      <TouchableOpacity style={styles.startButton} onPress={handleStartCamera}>
        <Text style={styles.startButtonText}>カメラを起動する</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  hint: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  voiceIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  voiceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#888',
  },
  voiceDotActive: {
    backgroundColor: '#FF3B30',
  },
  voiceLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  capturingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  capturingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: 'rgba(200,0,0,0.7)',
    padding: 14,
    borderRadius: 30,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
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
  composedImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginTop: 16,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  retakeButton: {
    backgroundColor: '#666',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retakeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.4,
  },
  saveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
