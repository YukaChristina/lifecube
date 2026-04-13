import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Photos = { back: string; front: string };
type CaptureStep = 'idle' | 'capturingFront';

export default function CameraScreen() {
  const [cameraActive, setCameraActive] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [photos, setPhotos] = useState<Photos | null>(null);
  const [captureStep, setCaptureStep] = useState<CaptureStep>('idle');
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleStartCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setFacing('back');
    setCameraActive(true);
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);

    // Step 1: 外カメラで撮影
    const backResult = await cameraRef.current.takePictureAsync();
    if (!backResult?.uri) {
      setIsCapturing(false);
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
      setFacing('back');
    }, 500); // カメラ切替の待機時間

    return () => clearTimeout(timer);
  }, [captureStep, backPhotoUri]);

  // プレビュー画面（両方の写真を表示）
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

  // カメラ画面
  if (cameraActive) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
        {isCapturing && (
          <View style={styles.capturingOverlay}>
            <Text style={styles.capturingText}>
              {captureStep === 'capturingFront' ? '内カメラに切替中...' : '撮影中...'}
            </Text>
          </View>
        )}
        <View style={styles.cameraControls}>
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

  // トップ画面
  return (
    <View style={styles.container}>
      <Text style={styles.title}>カメラ</Text>
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
    marginBottom: 24,
    color: '#333',
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 60,
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
