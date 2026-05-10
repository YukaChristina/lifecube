import { StyleSheet, Text, View } from 'react-native';

export function CaptureSwitchingOverlay() {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.card}>
        <Text style={styles.title}>撮影切り替え中です</Text>
        <Text style={styles.text}>カメラを動かさないでください</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(243,184,200,0.70)',
    backgroundColor: 'rgba(255,250,252,0.72)',
  },
  title: {
    color: '#4D4650',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  text: {
    color: '#4D4650',
    fontSize: 14,
    fontWeight: '600',
  },
});
