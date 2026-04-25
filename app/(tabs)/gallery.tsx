import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GALLERY_DIR = `${FileSystem.documentDirectory}gallery/`;
const NUM_COLUMNS = 3;
const ITEM_SIZE = Dimensions.get('window').width / NUM_COLUMNS;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const info = await FileSystem.getInfoAsync(GALLERY_DIR);
      if (!info.exists) { setPhotos([]); return; }
      const files = await FileSystem.readDirectoryAsync(GALLERY_DIR);
      const sorted = files
        .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
        .sort()
        .reverse()
        .map(f => `${GALLERY_DIR}${f}`);
      setPhotos(sorted);
    } catch {
      setPhotos([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPhotos(); }, [loadPhotos]));

  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>まだ写真がありません</Text>
        <Text style={styles.emptyHint}>カメラで撮影して保存すると、ここに表示されます</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>ギャラリー</Text>
      <FlatList
        data={photos}
        numColumns={NUM_COLUMNS}
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedUri(item)}>
            <Image source={{ uri: item }} style={styles.thumbnail} />
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selectedUri} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeArea} onPress={() => setSelectedUri(null)} />
          {selectedUri && (
            <Image
              source={{ uri: selectedUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedUri(null)}>
            <Text style={styles.modalCloseText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thumbnail: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderWidth: 1,
    borderColor: '#fff',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  modalClose: {
    position: 'absolute',
    bottom: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
