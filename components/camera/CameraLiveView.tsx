import { CameraView, type CameraOrientation, type CameraType } from 'expo-camera';
import type { RefObject } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureSwitchingOverlay } from './CaptureSwitchingOverlay';

type CameraLiveViewProps = {
  cameraRef: RefObject<CameraView | null>;
  facing: CameraType;
  isCapturing: boolean;
  voiceUnavailable: boolean;
  backOnly: boolean;
  onCameraOrientationChange: (orientation: CameraOrientation) => void;
  onTakePhoto: () => void;
  onToggleCameraMode: () => void;
};

export function CameraLiveView({
  cameraRef,
  facing,
  isCapturing,
  voiceUnavailable,
  backOnly,
  onCameraOrientationChange,
  onTakePhoto,
  onToggleCameraMode,
}: CameraLiveViewProps) {
  const insets = useSafeAreaInsets();
  const voiceGuideText = voiceUnavailable
    ? '音声の許可が必要です'
    : '「シャッター」と言うと撮影します';

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        responsiveOrientationWhenOrientationLocked
        onResponsiveOrientationChanged={({ orientation }) => {
          onCameraOrientationChange(orientation);
        }}
      />

      <View style={[styles.voiceIndicator, { top: Math.max(insets.top, 16) + 8 }]}>
        <Text style={[styles.voiceLabel, voiceUnavailable && styles.voiceLabelWarning]}>
          {voiceGuideText}
        </Text>
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
    alignItems: 'center',
    maxWidth: '78%',
    backgroundColor: 'rgba(255,250,252,0.54)',
    borderColor: 'rgba(243,184,200,0.30)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  voiceLabel: {
    color: 'rgba(77,70,80,0.78)',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  voiceLabelWarning: {
    color: '#6D4A59',
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
