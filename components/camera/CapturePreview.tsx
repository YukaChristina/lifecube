import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PhotoOrientation } from '@/features/photo-sets/types';

const PREVIEW_CLOSE_DELAY_MS = 4000;

type CapturePreviewProps = {
  isComposing: boolean;
  composedUri: string | null;
  orientation: PhotoOrientation | null;
  closeScheduledAt: number | null;
  onResetToCamera: () => void;
  onShare: () => void;
  onDelete: () => void;
};

export function CapturePreview({
  isComposing,
  composedUri,
  orientation,
  closeScheduledAt,
  onResetToCamera,
  onShare,
  onDelete,
}: CapturePreviewProps) {
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const previewResizeMode = orientation === 'landscape' ? 'contain' : 'cover';

  useEffect(() => {
    if (closeScheduledAt == null) {
      progressAnim.stopAnimation();
      progressAnim.setValue(0);
      return;
    }
    const elapsed = Date.now() - closeScheduledAt;
    const remaining = Math.max(0, PREVIEW_CLOSE_DELAY_MS - elapsed);
    progressAnim.setValue(Math.min(1, elapsed / PREVIEW_CLOSE_DELAY_MS));
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false,
    }).start();
  }, [closeScheduledAt, progressAnim]);

  return (
    <View style={styles.container}>
      {isComposing ? (
        <View style={styles.composingBox}>
          <Animated.View style={styles.composingSpinner} />
          <Text style={styles.composingText}>画像を合成中...</Text>
        </View>
      ) : composedUri ? (
        <>
          <Image
            source={{ uri: composedUri }}
            style={styles.previewImage}
            resizeMode={previewResizeMode}
          />
          <Pressable style={styles.previewTapLayer} onPress={onResetToCamera} />

          <View
            style={[
              styles.previewInstructionBar,
              { paddingTop: Math.max(insets.top, 18) + 10 },
            ]}
            pointerEvents="none">
            <Text style={styles.previewInstructionText}>画面をタップでカメラへ戻る</Text>
          </View>

          <View
            style={[
              styles.previewActions,
              {
                right: insets.right + 18,
                bottom: Math.max(insets.bottom, 18) + 32,
              },
            ]}>
            <TouchableOpacity style={styles.previewActionButton} onPress={onShare}>
              <Text style={styles.previewActionText}>Instagramで共有</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.previewActionButton} onPress={onDelete}>
              <Text style={styles.previewActionText}>削除する</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressTrack} pointerEvents="none">
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  composingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  composingSpinner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(243,184,200,0.30)',
    borderTopColor: '#F3B8C8',
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
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(255,250,252,0.28)',
    zIndex: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(243,184,200,0.82)',
  },
});
