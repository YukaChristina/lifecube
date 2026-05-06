import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listPhotoSets } from '@/features/photo-sets/db';
import { groupPhotoSetsByDate } from '@/features/photo-sets/group-photo-sets';
import type { PhotoSet } from '@/features/photo-sets/types';

const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = 20;
const GRID_GAP = 6;

type PhotoSetGridSection = {
  title: string;
  data: PhotoSet[][];
};

function chunkPhotoSets(photoSets: PhotoSet[]) {
  const rows: PhotoSet[][] = [];

  for (let index = 0; index < photoSets.length; index += NUM_COLUMNS) {
    rows.push(photoSets.slice(index, index + NUM_COLUMNS));
  }

  return rows;
}

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [sections, setSections] = useState<PhotoSetGridSection[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const thumbnailWidth =
    (width - HORIZONTAL_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const loadPhotos = useCallback(async () => {
    try {
      const photoSets = await listPhotoSets();
      const visiblePhotoSets: PhotoSet[] = [];

      for (const photoSet of photoSets) {
        if (photoSet.deletedAt !== null) continue;

        const fileInfo = await FileSystem.getInfoAsync(photoSet.composedLocalUri);
        if (fileInfo.exists) {
          visiblePhotoSets.push(photoSet);
        }
      }

      setSections(
        groupPhotoSetsByDate(visiblePhotoSets).map(group => ({
          title: group.title,
          data: chunkPhotoSets(group.items),
        })),
      );
      setErrorMessage(null);
    } catch {
      setSections([]);
      setErrorMessage('アルバムを読み込めませんでした');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPhotos();
    }, [loadPhotos]),
  );

  const openPhotoSet = useCallback((photoSet: PhotoSet) => {
    router.push(`/photo-set/${encodeURIComponent(photoSet.id)}` as Href);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>アルバム</Text>

      {errorMessage ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{errorMessage}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>まだ写真がありません</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item[0]?.id ?? 'empty'}-${index}`}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 18) + 18 },
          ]}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.gridRow}>
              {item.map(photoSet => (
                <Pressable
                  key={photoSet.id}
                  onPress={() => openPhotoSet(photoSet)}
                  style={({ pressed }) => [
                    styles.thumbnailButton,
                    {
                      width: thumbnailWidth,
                      height: thumbnailWidth * (16 / 9),
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}>
                  <Image
                    source={{ uri: photoSet.composedLocalUri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#44504D',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: 18,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 8,
  },
  sectionTitle: {
    color: '#6F7976',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  thumbnailButton: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#DDEDEA',
    backgroundColor: '#FFF9FB',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FBFA',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6F7976',
    textAlign: 'center',
  },
});
