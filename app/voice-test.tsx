import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useRouter } from 'expo-router';

export default function VoiceTestScreen() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [shutterDetected, setShutterDetected] = useState(false);
  const [error, setError] = useState('');

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError('');
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (text.includes('シャッター')) {
      setShutterDetected(true);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setError(`エラー: ${event.error}`);
    setIsListening(false);
  });

  const handleStart = async () => {
    setShutterDetected(false);
    setTranscript('');
    setError('');

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('マイクの権限が必要です');
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: 'ja-JP',
      interimResults: true,
      continuous: true,
    });
  };

  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← 戻る</Text>
      </TouchableOpacity>

      <Text style={styles.title}>音声認識テスト</Text>

      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isListening && styles.statusDotActive]} />
        <Text style={styles.statusText}>{isListening ? '聞き取り中...' : '待機中'}</Text>
      </View>

      <View style={styles.transcriptBox}>
        <Text style={styles.transcriptLabel}>認識結果</Text>
        <Text style={styles.transcriptText}>
          {transcript || '（ここに認識テキストが表示されます）'}
        </Text>
      </View>

      {shutterDetected && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>シャッター検知！</Text>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.startButton, isListening && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={isListening}>
          <Text style={styles.buttonText}>聞き取り開始</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.stopButton, !isListening && styles.buttonDisabled]}
          onPress={handleStop}
          disabled={!isListening}>
          <Text style={styles.buttonText}>停止</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
  },
  statusDotActive: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 16,
    color: '#555',
  },
  transcriptBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    marginBottom: 24,
  },
  transcriptLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
  },
  alertBox: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  alertText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
