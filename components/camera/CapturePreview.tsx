import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CapturePreviewProps = {
  isComposing: boolean;
  composedUri: string | null;
  onResetToCamera: () => void;
  onShare: () => void;
  onDelete: () => void;
};

export function CapturePreview({
  isComposing,
  composedUri,
  onResetToCamera,
  onShare,
  onDelete,
}: CapturePreviewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {isComposing ? (
        <View style={styles.composingBox}>
          <ActivityIndicator size="large" color="#F3B8C8" />
          <Text style={styles.composingText}>画像を合成中...</Text>
        </View>
      ) : composedUri ? (
        <>
          <Image source={{ uri: composedUri }} style={styles.previewImage} resizeMode="cover" />
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
