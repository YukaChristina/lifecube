import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PATTERN_PREVIEWS = [
  { id: 'diagonal', enabled: true },
  { id: 'circle', enabled: false },
  { id: 'split', enabled: false },
] as const;

const SCREEN_PADDING = 20;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

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
          {PATTERN_PREVIEWS.map(pattern => (
            <View
              key={pattern.id}
              style={[
                styles.patternCard,
                pattern.enabled ? styles.patternCardActive : styles.patternCardDisabled,
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
            </View>
          ))}
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
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFF9FB',
  },
  patternCardActive: {
    borderColor: 'rgba(243, 184, 200, 0.78)',
  },
  patternCardDisabled: {
    opacity: 0.34,
    borderColor: 'rgba(111, 121, 118, 0.22)',
  },
  diagonalPaneLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '58%',
    backgroundColor: '#F3B8C8',
    transform: [{ skewX: '-12deg' }],
  },
  diagonalPaneRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '60%',
    backgroundColor: '#C7E6DC',
    transform: [{ skewX: '-12deg' }],
  },
  diagonalLine: {
    position: 'absolute',
    top: '-10%',
    left: '48%',
    width: 4,
    height: '120%',
    borderRadius: 4,
    backgroundColor: '#F3B8C8',
    transform: [{ rotate: '12deg' }],
  },
  circleBase: {
    flex: 1,
    backgroundColor: '#E8F2F8',
  },
  circleInset: {
    position: 'absolute',
    right: 10,
    bottom: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#C7E6DC',
    backgroundColor: '#F3B8C8',
  },
  splitLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: '#F3B8C8',
  },
  splitDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '48%',
    width: 6,
    backgroundColor: '#C7E6DC',
  },
  splitRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: '#C7E6DC',
  },
});
