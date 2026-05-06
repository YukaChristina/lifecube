import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import {
  Image,
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listPhotoSets } from '@/features/photo-sets/db';
import { groupPhotoSetsByDate } from '@/features/photo-sets/group-photo-sets';
import type { PhotoSet } from '@/features/photo-sets/types';

const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = 16;
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
                <Image
                  key={photoSet.id}
                  source={{ uri: photoSet.composedLocalUri }}
                  style={[
                    styles.thumbnail,
                    {
                      width: thumbnailWidth,
                      height: thumbnailWidth * (16 / 9),
                    },
                  ]}
                  resizeMode="cover"
                />
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
    backgroundColor: '#FFFCFD',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#3F3941',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 6,
  },
  sectionTitle: {
    color: '#6D646B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  thumbnail: {
    borderRadius: 6,
    backgroundColor: '#F6EEF2',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFCFD',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6D646B',
    textAlign: 'center',
  },
});
