import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

type Photos = { back: string; front: string };
type CaptureStep = 'idle' | 'capturingFront';

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [cameraActive, setCameraActive] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [photos, setPhotos] = useState<Photos | null>(null);
  const [captureStep, setCaptureStep] = useState<CaptureStep>('idle');
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // refs for use inside event callbacks (avoid stale closures)
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

  // ── 音声認識イベント ──────────────────────────────────────────
  useSpeechRecognitionEvent('start', () => setVoiceListening(true));

  useSpeechRecognitionEvent('end', () => {
    setVoiceListening(false);
    // continuous: true でも端末によって途切れる場合があるため自動再起動
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

    // Step 1: 外カメラで撮影
    const backResult = await cameraRef.current.takePictureAsync();
    if (!backResult?.uri) {
      setIsCapturing(false);
      isCapturingRef.current = false;
      return;
    }
    setBackPhotoUri(backResult.uri);

    // Step 2: 内カメラに切替（useEffectで撮影）
    setFacing('front');
    setCaptureStep('capturingFront');
  };

  // 内カメラへの切替後に撮影
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

  // ── プレビュー画面 ────────────────────────────────────────────
  if (photos) {
    return (
      <ScrollView contentContainerStyle={styles.previewContainer}>
        <Text style={styles.title}>撮影結果</Text>
        <Text style={styles.label}>外カメラ</Text>
        <Image source={{ uri: photos.back }} style={styles.preview} />
        <Text style={styles.label}>内カメラ</Text>
        <Image source={{ uri: photos.front }} style={styles.preview} />
        <View style={styles.previewButtons}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => { setPhotos(null); setCameraActive(true); }}>
            <Text style={styles.retakeText}>撮り直す</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneButton} onPress={() => setPhotos(null)}>
            <Text style={styles.doneText}>完了</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── カメラ画面 ────────────────────────────────────────────────
  if (cameraActive) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

        {/* 音声認識インジケーター */}
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
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 16,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
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
  doneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  doneText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
