import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_PADDING = 20;

const GUIDE_SECTIONS = [
  {
    title: '撮影方法',
    body: 'カメラ画面で「シャッター」と言うと撮影します。画面下のシャッターボタンでも撮影できます。',
  },
  {
    title: '撮影の流れ',
    body: '前後モードでは、外側カメラで撮ったあと内側カメラに切り替わり、2枚の写真を1枚に合成します。',
  },
  {
    title: 'プレビュー',
    body: '撮影後は4秒間プレビューが表示されます。画面をタップするとすぐにカメラへ戻れます。',
  },
  {
    title: '保存と削除',
    body: '撮影した写真はLifeCubeのアルバムで確認できます。成果物画像は端末の写真アプリにも保存されるため、完全に消したい場合は両方を確認してください。',
  },
];

export default function GuideScreen() {
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
      <Text style={styles.title}>ガイド</Text>

      <View style={styles.intro}>
        <Text style={styles.introText}>
          LifeCubeで写真を残すための基本的な流れです。
        </Text>
      </View>

      {GUIDE_SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.bodyText}>{section.body}</Text>
        </View>
      ))}
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
  intro: {
    borderLeftWidth: 3,
    borderLeftColor: '#F3B8C8',
    paddingLeft: 12,
  },
  introText: {
    color: '#6F7976',
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    gap: 8,
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
});
