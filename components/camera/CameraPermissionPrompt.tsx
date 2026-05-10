import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CameraBackdrop } from './CameraBackdrop';

type CameraPermissionPromptProps = {
  blocked: boolean;
  onPressAction: () => void;
};

export function CameraPermissionPrompt({
  blocked,
  onPressAction,
}: CameraPermissionPromptProps) {
  return (
    <View style={styles.container}>
      <CameraBackdrop />

      <View style={styles.card}>
        <Text style={styles.title}>
          {blocked ? '撮影には許可が必要です' : 'カメラとマイクを使います'}
        </Text>
        <Text style={styles.text}>
          {blocked
            ? '設定からカメラとマイクの許可を変更できます'
            : '撮影のために許可してください'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onPressAction}>
          <Text style={styles.buttonText}>
            {blocked ? '設定を開く' : '許可を確認する'}
          </Text>
        </TouchableOpacity>
      </View>
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
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 184, 200, 0.70)',
    backgroundColor: 'rgba(255, 250, 252, 0.78)',
  },
  title: {
    color: '#4D4650',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  text: {
    color: '#6E6670',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#F3B8C8',
  },
  buttonText: {
    color: '#4D4650',
    fontSize: 14,
    fontWeight: '700',
  },
});
