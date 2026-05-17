import * as FileSystem from 'expo-file-system/legacy';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPhotoSetById, updatePhotoSetComposed } from '@/features/photo-sets/db';
import { deleteSavedPhotoSet } from '@/features/photo-sets/save-photo-set';
import { getPhotoSetDirectory } from '@/features/photo-sets/storage';
import {
  DEFAULT_FRONT_IMAGE_FOCUS,
  type CompositePattern,
  type PhotoSet,
} from '@/features/photo-sets/types';
import { composePhotos, getComposedPhotoSize } from '@/utils/composePhoto';

type DetailMode = 'composed' | 'original';

type OriginalAvailability = {
  back: boolean;
  front: boolean;
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

async function fileExists(uri: string | null | undefined) {
  if (!uri) return false;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}

function getFrontImageFocus(photoSet: PhotoSet) {
  return {
    x: photoSet.frontImageFocusX ?? DEFAULT_FRONT_IMAGE_FOCUS.x,
    y: photoSet.frontImageFocusY ?? DEFAULT_FRONT_IMAGE_FOCUS.y,
    scale: photoSet.frontImageScale ?? DEFAULT_FRONT_IMAGE_FOCUS.scale,
  };
}

export default function PhotoSetDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { width } = useWindowDimensions();
  const [photoSet, setPhotoSet] = useState<PhotoSet | null>(null);
  const [mode, setMode] = useState<DetailMode>('composed');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [originalAvailability, setOriginalAvailability] = useState<OriginalAvailability>({
    back: false,
    front: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingPattern, setIsUpdatingPattern] = useState(false);

  const photoSetId = getParamValue(id);

  const goBackToAlbum = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/gallery' as Href);
  }, [router]);

  const loadPhotoSet = useCallback(async () => {
    if (!photoSetId) {
      setErrorMessage('写真を表示できませんでした');
      return;
    }

    try {
      const nextPhotoSet = await getPhotoSetById(photoSetId);
      const composedExists = await fileExists(nextPhotoSet?.composedLocalUri);

      if (!nextPhotoSet || !composedExists) {
        setPhotoSet(null);
        setErrorMessage('写真を表示できませんでした');
        return;
      }

      const [backExists, frontExists] = await Promise.all([
        fileExists(nextPhotoSet.backLocalUri),
        fileExists(nextPhotoSet.frontLocalUri),
      ]);

      setPhotoSet(nextPhotoSet);
      setOriginalAvailability({ back: backExists, front: frontExists });
      setErrorMessage(null);
    } catch {
      setPhotoSet(null);
      setErrorMessage('写真を表示できませんでした');
    }
  }, [photoSetId]);

  useEffect(() => {
    void loadPhotoSet();
  }, [loadPhotoSet]);

  const handleShare = useCallback(async () => {
    if (!photoSet) return;

    await Share.share({
      message: 'LifeCube',
      url: photoSet.composedLocalUri,
    });
  }, [photoSet]);

  const deletePhotoSet = useCallback(async () => {
    if (!photoSet || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteSavedPhotoSet(photoSet);
      goBackToAlbum();
    } catch {
      Alert.alert('削除できませんでした', '時間をおいてもう一度お試しください。');
      setIsDeleting(false);
    }
  }, [goBackToAlbum, isDeleting, photoSet]);

  const confirmDelete = useCallback(() => {
    if (!photoSet || isDeleting) return;

    Alert.alert(
      '写真を削除しますか？',
      'LifeCubeアルバムから削除します。端末の写真アプリに保存された画像は残ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            void deletePhotoSet();
          },
        },
      ],
    );
  }, [deletePhotoSet, isDeleting, photoSet]);

  const handleUpdatePattern = async (newPattern: CompositePattern) => {
    if (!photoSet || isUpdatingPattern || !photoSet.backLocalUri || !photoSet.frontLocalUri) return;

    let tempUri: string | null = null;
    let copiedComposedUri: string | null = null;
    setIsUpdatingPattern(true);
    try {
      const composedSize = getComposedPhotoSize(photoSet.orientation);
      tempUri = await composePhotos(
        photoSet.frontLocalUri,
        photoSet.backLocalUri,
        newPattern,
        photoSet.orientation,
        getFrontImageFocus(photoSet),
      );
      const composedLocalUri = `${getPhotoSetDirectory(photoSet.id)}composed-${Date.now()}.png`;
      await FileSystem.copyAsync({ from: tempUri, to: composedLocalUri });
      copiedComposedUri = composedLocalUri;
      await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => undefined);
      tempUri = null;
      await updatePhotoSetComposed(
        photoSet.id,
        composedLocalUri,
        newPattern,
        composedSize.width,
        composedSize.height,
      );
      copiedComposedUri = null;

      // 状態を更新
      setPhotoSet(prev => prev ? {
        ...prev,
        composedLocalUri,
        pattern: newPattern,
        composedWidth: composedSize.width,
        composedHeight: composedSize.height,
      } : null);
      if (photoSet.composedLocalUri !== composedLocalUri) {
        await FileSystem.deleteAsync(photoSet.composedLocalUri, { idempotent: true })
          .catch(() => undefined);
      }
    } catch (err) {
      if (tempUri) {
        await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => undefined);
      }
      if (copiedComposedUri) {
        await FileSystem.deleteAsync(copiedComposedUri, { idempotent: true }).catch(() => undefined);
      }
      Alert.alert('更新に失敗しました', '画像の再合成中にエラーが発生しました。');
      console.error(err);
    } finally {
      setIsUpdatingPattern(false);
    }
  };

  const imageMaxWidth = Math.min(width - 32, 420);
  const canUpdatePattern = Boolean(
    photoSet?.captureMode === 'dual' && photoSet.backLocalUri && photoSet.frontLocalUri,
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={goBackToAlbum}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        {mode === 'original' ? (
          <Text style={styles.headerTitle}>オリジナル</Text>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {errorMessage || !photoSet ? (
        <View style={styles.messageArea}>
          <Text style={styles.messageText}>{errorMessage ?? '写真を表示できませんでした'}</Text>
        </View>
      ) : mode === 'original' ? (
        <ScrollView
          contentContainerStyle={[
            styles.originalContent,
            {
              paddingTop: insets.top + 72,
              paddingBottom: Math.max(insets.bottom, 18) + 28,
            },
          ]}>
          <OriginalPhoto
            label="外側"
            uri={photoSet.backLocalUri}
            exists={originalAvailability.back}
            orientation={photoSet.orientation}
            width={imageMaxWidth}
          />
          <OriginalPhoto
            label="内側"
            uri={photoSet.captureMode === 'dual' ? photoSet.frontLocalUri : null}
            exists={originalAvailability.front}
            orientation={photoSet.orientation}
            width={imageMaxWidth}
          />
          <Pressable style={styles.returnButton} onPress={() => setMode('composed')}>
            <Text style={styles.returnButtonText}>合成写真に戻る</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={[
          styles.composedContent,
          {
            paddingTop: insets.top + 64,
            paddingBottom: Math.max(insets.bottom, 18) + 24,
          },
        ]}>
          <View style={styles.composedImageFrame}>
            {isUpdatingPattern ? (
              <View style={styles.updatingOverlay}>
                <ActivityIndicator size="large" color="#F3B8C8" />
              </View>
            ) : (
              <Image
                source={{ uri: photoSet.composedLocalUri }}
                style={styles.composedImage}
                resizeMode="contain"
              />
            )}
            <Pressable style={styles.originalButton} onPress={() => setMode('original')}>
              <Text style={styles.originalButtonText}>オリジナルを見る</Text>
            </Pressable>
          </View>

          {canUpdatePattern ? (
            <View style={styles.patternSwitcher}>
              <PatternButton
                active={photoSet.pattern === 'diagonal'}
                onPress={() => handleUpdatePattern('diagonal')}
                label="斜め"
              />
              <PatternButton
                active={photoSet.pattern === 'circle'}
                onPress={() => handleUpdatePattern('circle')}
                label="円形"
              />
              <PatternButton
                active={photoSet.pattern === 'split'}
                onPress={() => handleUpdatePattern('split')}
                label="分割"
              />
            </View>
          ) : null}

          <View style={styles.actionArea}>
            <Pressable style={styles.actionButton} onPress={handleShare}>
              <Text style={styles.actionButtonText}>Instagramで共有</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.deleteButton,
                (pressed || isDeleting) && styles.actionButtonPressed,
              ]}
              disabled={isDeleting}
              onPress={confirmDelete}>
              <Text style={styles.actionButtonText}>削除する</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function PatternButton({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.patternBtn, active && styles.patternBtnActive]}
    >
      <Text style={[styles.patternBtnText, active && styles.patternBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function OriginalPhoto({
  label,
  uri,
  exists,
  orientation,
  width,
}: {
  label: string;
  uri: string | null;
  exists: boolean;
  orientation: PhotoSet['orientation'];
  width: number;
}) {
  if (!uri && !exists) return null;

  const height = orientation === 'landscape'
    ? width * (9 / 16)
    : width * (16 / 9);

  return (
    <View style={styles.originalBlock}>
      <Text style={styles.originalLabel}>{label}</Text>
      {exists && uri ? (
        <Image
          source={{ uri }}
          style={[styles.originalImage, { width, height }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.originalMissing, { width, height }]}>
          <Text style={styles.originalMissingText}>表示できません</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F1A20',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255, 250, 252, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 250, 252, 0.18)',
  },
  backButtonText: {
    color: '#FFF7FA',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#FFF7FA',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  messageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  messageText: {
    color: '#E9DDE4',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  composedContent: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 18,
  },
  composedImageFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composedImage: {
    width: '100%',
    height: '100%',
  },
  originalButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 250, 252, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(243, 184, 200, 0.52)',
  },
  originalButtonText: {
    color: '#FFF7FA',
    fontSize: 14,
    fontWeight: '800',
  },
  actionArea: {
    alignItems: 'stretch',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,184,200,0.70)',
    backgroundColor: 'rgba(255,250,252,0.78)',
  },
  deleteButton: {
    marginTop: 4,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#4D4650',
    fontSize: 14,
    fontWeight: '800',
  },
  originalContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 18,
  },
  originalBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  originalLabel: {
    alignSelf: 'flex-start',
    color: '#E9DDE4',
    fontSize: 13,
    fontWeight: '700',
  },
  originalImage: {
    borderRadius: 8,
    backgroundColor: '#181418',
  },
  originalMissing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 250, 252, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 250, 252, 0.12)',
  },
  originalMissingText: {
    color: '#CDBFC8',
    fontSize: 13,
    fontWeight: '600',
  },
  returnButton: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,250,252,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(243,184,200,0.70)',
  },
  returnButtonText: {
    color: '#4D4650',
    fontSize: 14,
    fontWeight: '800',
  },
  updatingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 10,
  },
  patternBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 250, 252, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 250, 252, 0.2)',
  },
  patternBtnActive: {
    backgroundColor: '#F3B8C8',
    borderColor: '#F3B8C8',
  },
  patternBtnText: {
    color: '#FFF7FA',
    fontSize: 13,
    fontWeight: '600',
  },
  patternBtnTextActive: {
    color: '#4D4650',
  },
});
