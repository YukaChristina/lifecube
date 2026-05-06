import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '@/utils/settings';
import { CompositePattern } from '@/features/photo-sets/types';

const PATTERNS: { id: CompositePattern; label: string }[] = [
  { id: 'diagonal', label: '斜めカット' },
  { id: 'circle', label: '円形くりぬき' },
  { id: 'split', label: '左右分割' },
];

const SCREEN_PADDING = 20;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPattern, setSelectedPattern] = useState<CompositePattern>('diagonal');

  useEffect(() => {
    loadSettings().then(s => setSelectedPattern(s.defaultPattern));
  }, []);

  const handleSelectPattern = async (pattern: CompositePattern) => {
    setSelectedPattern(pattern);
    await saveSettings({ defaultPattern: pattern });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 18,
          paddingBottom: Math.max(insets.bottom, 18) + 28,
        },
      ]}>
      <Text style={styles.title}>ホーム</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アプリ説明</Text>
        <Text style={styles.bodyText}>
          LifeCubeは、家族の会話や反応の中で生まれる思い出を、外側と内側の写真セットとして自然に残すカメラです。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>合成パターン設定</Text>
        <View style={styles.patternRow}>
          {PATTERNS.map(pattern => {
            const isActive = selectedPattern === pattern.id;
            return (
              <Pressable
                key={pattern.id}
                onPress={() => handleSelectPattern(pattern.id)}
                style={[
                  styles.patternCard,
                  isActive ? styles.patternCardActive : styles.patternCardInactive,
                ]}>
                {pattern.id === 'diagonal' ? (
                  <>
                    <View style={styles.diagonalPaneLeft} />
                    <View style={styles.diagonalPaneRight} />
                    <View style={styles.diagonalLine} />
                  </>
                ) : pattern.id === 'circle' ? (
                  <>
                    <View style={styles.circleBase} />
                    <View style={styles.circleInset} />
                  </>
                ) : (
                  <>
                    <View style={styles.splitLeft} />
                    <View style={styles.splitDivider} />
                    <View style={styles.splitRight} />
                  </>
                )}
                {isActive && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>課金設定</Text>
        <Text style={styles.bodyText}>準備中</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFA',
  },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    gap: 24,
  },
  title: {
    color: '#44504D',
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#44504D',
    fontSize: 15,
    fontWeight: '800',
  },
  bodyText: {
    color: '#6F7976',
    fontSize: 14,
    lineHeight: 22,
  },
  patternRow: {
    flexDirection: 'row',
    gap: 10,
  },
  patternCard: {
    flex: 1,
    aspectRatio: 9 / 16,
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#FFF9FB',
  },
  patternCardActive: {
    borderColor: '#F3B8C8',
    backgroundColor: '#FFF',
  },
  patternCardInactive: {
    borderColor: 'rgba(111, 121, 118, 0.12)',
    opacity: 0.6,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3B8C8',
  },
  diagonalPaneLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '58%',
    backgroundColor: 'rgba(243, 184, 200, 0.15)',
    transform: [{ skewX: '-12deg' }],
  },
  diagonalPaneRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '60%',
    backgroundColor: 'rgba(199, 230, 220, 0.15)',
    transform: [{ skewX: '-12deg' }],
  },
  diagonalLine: {
    position: 'absolute',
    top: '-10%',
    left: '48%',
    width: 2,
    height: '120%',
    backgroundColor: '#F3B8C8',
    transform: [{ rotate: '12deg' }],
  },
  circleBase: {
    flex: 1,
    backgroundColor: 'rgba(200, 223, 242, 0.15)',
  },
  circleInset: {
    position: 'absolute',
    right: 8,
    bottom: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C8DFF2',
    backgroundColor: 'rgba(243, 184, 200, 0.2)',
  },
  splitLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: 'rgba(243, 184, 200, 0.15)',
  },
  splitDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '48%',
    width: 3,
    backgroundColor: '#C7E6DC',
  },
  splitRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: 'rgba(199, 230, 220, 0.15)',
  },
});
