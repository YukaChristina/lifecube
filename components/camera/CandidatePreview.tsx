import * as MediaLibrary from 'expo-media-library';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ExtractedFrame } from '@/utils/selectBestFrames';

type CandidatePreviewProps = {
  candidates: ExtractedFrame[];
  onDone: () => void;
};

export function CandidatePreview({ candidates, onDone }: CandidatePreviewProps) {
  const insets = useSafeAreaInsets();

  const savePhoto = async (uri: string) => {
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
    } catch (e) {
      console.error('保存失敗:', e);
    }
  };

  const saveAll = async () => {
    await Promise.all(candidates.map(f => savePhoto(f.uri)));
    onDone();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.title}>候補写真を選んでください</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {candidates.map((frame, i) => (
          <View key={frame.uri} style={styles.card}>
            <Image source={{ uri: frame.uri }} style={styles.image} resizeMode="cover" />
            <View style={styles.cardFooter}>
              <Text style={styles.label}>{Math.round(frame.timeMs / 1000)}秒地点</Text>
              <TouchableOpacity style={styles.saveButton} onPress={async () => { await savePhoto(frame.uri); onDone(); }}>
                <Text style={styles.saveButtonText}>この1枚を保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveAllButton} onPress={saveAll}>
          <Text style={styles.saveAllText}>全て保存（{candidates.length}枚）</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onDone}>
          <Text style={styles.cancelText}>戻る</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  list: {
    gap: 16,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: 'rgba(220,80,80,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    gap: 10,
    marginTop: 8,
  },
  saveAllButton: {
    backgroundColor: 'rgba(220,80,80,0.9)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveAllText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
});
