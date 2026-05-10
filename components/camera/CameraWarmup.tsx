import { StyleSheet, View } from 'react-native';

import { CameraBackdrop } from './CameraBackdrop';

export function CameraWarmup() {
  return (
    <View style={styles.container}>
      <CameraBackdrop />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F4F6',
    paddingHorizontal: 28,
  },
});
