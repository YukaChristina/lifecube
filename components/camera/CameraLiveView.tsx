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
  backOnly: boolean;
  onTakePhoto: () => void;
  onToggleCameraMode: () => void;
};

export function CameraLiveView({
  cameraRef,
  facing,
  isCapturing,
  voiceListening,
  voiceUnavailable,
  backOnly,
  onTakePhoto,
  onToggleCameraMode,
}: CameraLiveViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

      <View style={[styles.voiceIndicator, { top: Math.max(insets.top, 16) + 8 }]}>
        <View style={[styles.voiceDot, voiceListening && styles.voiceDotActive]} />
        {voiceUnavailable && (
          <Text style={styles.voiceLabel}>音声の許可が必要です</Text>
        )}
      </View>

      {isCapturing && !backOnly && <CaptureSwitchingOverlay />}

      <View
        style={[
          styles.cameraControls,
          {
            paddingBottom: Math.max(insets.bottom, 20) + 16,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
          },
        ]}>
        <TouchableOpacity
          style={[styles.modeToggle, backOnly && styles.modeToggleActive]}
          onPress={onToggleCameraMode}>
          <Text style={styles.modeToggleText}>{backOnly ? '背面' : '前後'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shutterButton, isCapturing && styles.shutterDisabled]}
          onPress={onTakePhoto}
          disabled={isCapturing}
        />
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
    paddingHorizontal: 10,
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
    width: 68,
  },
  modeToggle: {
    width: 68,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeToggleActive: {
    backgroundColor: 'rgba(243,184,200,0.30)',
    borderColor: 'rgba(243,184,200,0.60)',
  },
  modeToggleText: {
    color: '#4D4650',
    fontSize: 13,
    fontWeight: '700',
  },
  shutterButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(220,80,80,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(190,50,50,0.55)',
  },
  shutterDisabled: {
    opacity: 0.40,
  },
});
