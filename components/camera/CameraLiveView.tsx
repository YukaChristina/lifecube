import { CameraView, type CameraOrientation, type CameraType } from 'expo-camera';
import type { RefObject } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RollingBufferStatus } from '@/features/camera/useRollingBuffer';

type CameraLiveViewProps = {
  cameraRef: RefObject<CameraView | null>;
  facing: CameraType;
  isCapturing: boolean;
  voiceUnavailable: boolean;
  bufferStatus: RollingBufferStatus;
  onCameraOrientationChange: (orientation: CameraOrientation) => void;
  onCameraReady: (facing: CameraType) => void;
  onTakePhoto: () => void;
  onToggleFacing: () => void;
};

const CONTROLS_WIDTH = 96;

export function CameraLiveView({
  cameraRef,
  facing,
  isCapturing,
  voiceUnavailable,
  bufferStatus,
  onCameraOrientationChange,
  onCameraReady,
  onTakePhoto,
  onToggleFacing,
}: CameraLiveViewProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const captureAspect = 4 / 3;
  const overlayThickness = isLandscape
    ? Math.max(0, (width - height * captureAspect) / 2)
    : Math.max(0, (height - width * captureAspect) / 2);

  const chargingPortOnRight = isLandscape && insets.left >= insets.right;

  const voiceGuideText = voiceUnavailable
    ? '音声の許可が必要です'
    : '「シャッター」「すごい」などで撮影します';

  const controlsStyle = isLandscape
    ? {
        ...(chargingPortOnRight
          ? { right: 0, paddingRight: Math.max(insets.right, 12) + 12 }
          : { left: 0, paddingLeft: Math.max(insets.left, 12) + 12 }),
        top: 0,
        bottom: 0,
        width: CONTROLS_WIDTH,
        flexDirection: 'column' as const,
        justifyContent: 'space-around' as const,
        paddingVertical: 32,
        paddingTop: Math.max(insets.top, 32),
        paddingBottom: Math.max(insets.bottom, 32),
      }
    : {
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        paddingBottom: Math.max(insets.bottom, 20) + 16,
        paddingLeft: insets.left + 24,
        paddingRight: insets.right + 24,
      };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        responsiveOrientationWhenOrientationLocked
        onCameraReady={() => {
          onCameraReady(facing);
        }}
        onResponsiveOrientationChanged={({ orientation }) => {
          onCameraOrientationChange(orientation);
        }}
      />

      <View style={[styles.voiceIndicator, { top: Math.max(insets.top, 16) + 8 }]}>
        <Text style={[styles.voiceLabel, voiceUnavailable && styles.voiceLabelWarning]}>
          {voiceGuideText}
        </Text>
      </View>

      {/* [DEV] バッファ状態 */}
      <View style={[styles.bufferIndicator, { top: Math.max(insets.top, 16) + 48 }]}>
        <Text style={styles.bufferLabel}>
          {bufferStatus.isBuffering
            ? `● REC ${bufferStatus.bufferedSecs}s / ${bufferStatus.chunkCount}chunks`
            : '○ バッファ停止中'}
        </Text>
      </View>

      {overlayThickness > 0 && isLandscape && (
        <>
          <View style={[styles.captureOverlay, { left: 0, top: 0, bottom: 0, width: overlayThickness }]} />
          <View style={[styles.captureOverlay, { right: 0, top: 0, bottom: 0, width: overlayThickness }]} />
        </>
      )}
      {overlayThickness > 0 && !isLandscape && (
        <>
          <View style={[styles.captureOverlay, { top: 0, left: 0, right: 0, height: overlayThickness }]} />
          <View style={[styles.captureOverlay, { bottom: 0, left: 0, right: 0, height: overlayThickness }]} />
        </>
      )}

      <View style={[styles.cameraControls, controlsStyle]}>
        <TouchableOpacity style={styles.modeToggle} onPress={onToggleFacing}>
          <Text style={styles.modeToggleText}>{facing === 'front' ? '内' : '外'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shutterButton, isCapturing && styles.shutterDisabled]}
          onPress={onTakePhoto}
          disabled={isCapturing}
        />
        <View style={isLandscape ? styles.controlSpacerV : styles.controlSpacer} />
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
    alignItems: 'center',
    paddingTop: 18,
  },
  controlSpacer: {
    width: 68,
  },
  controlSpacerV: {
    height: 42,
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
  captureOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bufferIndicator: {
    position: 'absolute',
    alignSelf: 'center',
  },
  bufferLabel: {
    color: 'rgba(255,100,100,0.9)',
    fontSize: 11,
    fontWeight: '700',
  },
});
