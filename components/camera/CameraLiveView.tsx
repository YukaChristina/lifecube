import { CameraView, type CameraType } from 'expo-camera';
import type { RefObject } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureSwitchingOverlay } from './CaptureSwitchingOverlay';

type CameraLiveViewProps = {
  cameraRef: RefObject<CameraView | null>;
  facing: CameraType;
  isCapturing: boolean;
  voiceListening: boolean;
  voiceUnavailable: boolean;
  onTakePhoto: () => void;
};

export function CameraLiveView({
  cameraRef,
  facing,
  isCapturing,
  voiceListening,
  voiceUnavailable,
  onTakePhoto,
}: CameraLiveViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

      <View style={[styles.voiceIndicator, { top: Math.max(insets.top, 16) + 8 }]}>
        <View style={[styles.voiceDot, voiceListening && styles.voiceDotActive]} />
        <Text style={styles.voiceLabel}>
          {voiceUnavailable ? '音声の許可が必要です' : voiceListening ? '音声認識中' : '音声待機中'}
        </Text>
      </View>

      {isCapturing && <CaptureSwitchingOverlay />}

      <View
        style={[
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
          onPress={onTakePhoto}
          disabled={isCapturing}>
          <Text style={styles.shutterText}>撮影</Text>
        </TouchableOpacity>
        <View style={styles.controlSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
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
});
