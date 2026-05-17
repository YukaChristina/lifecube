import { Canvas, Circle, Path, Rect } from '@shopify/react-native-skia';
import { ScrollView, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '@/utils/settings';
import { CompositePattern } from '@/features/photo-sets/types';

const PATTERNS: { id: CompositePattern; label: string }[] = [
  { id: 'circle', label: '円形くりぬき' },
  { id: 'diagonal', label: '斜めカット' },
  { id: 'split', label: '左右分割' },
];

const SCREEN_PADDING = 20;
const PATTERN_GAP = 10;
const PATTERN_CARD_ASPECT_RATIO = 9 / 16;
const PATTERN_PREVIEW_BACK_FILL = '#EAF4F1';
const PATTERN_PREVIEW_FRONT_FILL = '#FBE8EF';
const PATTERN_PREVIEW_LINE = '#F3B8C8';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selectedPattern, setSelectedPattern] = useState<CompositePattern>('circle');
  const patternCardWidth = Math.max(
    76,
    (width - SCREEN_PADDING * 2 - PATTERN_GAP * 2) / 3,
  );
  const patternCardHeight = patternCardWidth / PATTERN_CARD_ASPECT_RATIO;

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
                  { width: patternCardWidth, height: patternCardHeight },
                  isActive ? styles.patternCardActive : styles.patternCardInactive,
                ]}>
                <PatternPreview
                  height={patternCardHeight}
                  pattern={pattern.id}
                  width={patternCardWidth}
                />
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

function PatternPreview({
  height,
  pattern,
  width,
}: {
  height: number;
  pattern: CompositePattern;
  width: number;
}) {
  if (pattern === 'diagonal') {
    const curve = `M ${width} 0 C ${width} ${height * 0.78} 0 ${height * 0.22} 0 ${height}`;
    const upperLeft = `M 0 0 L ${width} 0 C ${width} ${height * 0.78} 0 ${height * 0.22} 0 ${height} L 0 0 Z`;
    const lowerRight = `M ${width} 0 L ${width} ${height} L 0 ${height} C 0 ${height * 0.22} ${width} ${height * 0.78} ${width} 0 Z`;

    return (
      <Canvas style={styles.patternCanvas}>
        <Path path={upperLeft} color={PATTERN_PREVIEW_BACK_FILL} />
        <Path path={lowerRight} color={PATTERN_PREVIEW_FRONT_FILL} />
        <Path
          path={curve}
          color={PATTERN_PREVIEW_LINE}
          style="stroke"
          strokeWidth={2.2}
        />
      </Canvas>
    );
  }

  if (pattern === 'circle') {
    const radius = Math.min(width, height) * 0.25;
    const centerX = width - radius - width * 0.07;
    const centerY = height - radius - height * 0.08;

    return (
      <Canvas style={styles.patternCanvas}>
        <Rect x={0} y={0} width={width} height={height} color={PATTERN_PREVIEW_BACK_FILL} />
        <Circle cx={centerX} cy={centerY} r={radius} color={PATTERN_PREVIEW_FRONT_FILL} />
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          color={PATTERN_PREVIEW_LINE}
          style="stroke"
          strokeWidth={2.2}
        />
      </Canvas>
    );
  }

  const dividerX = width / 2;

  return (
    <Canvas style={styles.patternCanvas}>
      <Rect x={0} y={0} width={dividerX} height={height} color={PATTERN_PREVIEW_BACK_FILL} />
      <Rect x={dividerX} y={0} width={dividerX} height={height} color={PATTERN_PREVIEW_FRONT_FILL} />
      <Rect x={dividerX - 1.1} y={0} width={2.2} height={height} color={PATTERN_PREVIEW_LINE} />
    </Canvas>
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
    gap: PATTERN_GAP,
  },
  patternCard: {
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#FFF9FB',
  },
  patternCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  patternCardActive: {
    borderColor: '#F3B8C8',
    borderWidth: 3.5,
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
});
