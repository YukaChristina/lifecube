import { StyleSheet, View } from 'react-native';

export function CameraBackdrop() {
  return (
    <View style={styles.backdropFrame}>
      <View style={styles.backdropCircle} />
      <View style={styles.backdropLine} />
      <View style={[styles.backdropLine, styles.backdropLineShort]} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdropFrame: {
    position: 'absolute',
    top: 72,
    left: 28,
    right: 28,
    bottom: 88,
    borderWidth: 1,
    borderColor: 'rgba(243, 184, 200, 0.38)',
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
    borderRadius: 28,
  },
  backdropCircle: {
    position: 'absolute',
    top: 28,
    right: 28,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(199, 230, 220, 0.72)',
  },
  backdropLine: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 64,
    height: 1,
    backgroundColor: 'rgba(200, 223, 242, 0.52)',
  },
  backdropLineShort: {
    left: 72,
    right: 72,
    bottom: 44,
  },
});
