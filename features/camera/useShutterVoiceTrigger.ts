import {
  AVAudioSessionCategoryOptions,
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';

type UseShutterVoiceTriggerOptions = {
  active: boolean;
  disabled: boolean;
  onTrigger: () => void;
};

const SHUTTER_TRIGGER_WORD = 'シャッター';
const SPEECH_RESTART_DELAY_MS = 100;

export function useShutterVoiceTrigger({
  active,
  disabled,
  onTrigger,
}: UseShutterVoiceTriggerOptions) {
  const [listening, setListening] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const activeRef = useRef(active);
  const disabledRef = useRef(disabled);
  const onTriggerRef = useRef(onTrigger);
  const speechPermissionGrantedRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const requestSpeechPermission = useCallback(async () => {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      speechPermissionGrantedRef.current = granted;
      setUnavailable(!granted);
      return granted;
    } catch {
      speechPermissionGrantedRef.current = false;
      setUnavailable(true);
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    if (!activeRef.current) return;

    if (!speechPermissionGrantedRef.current) {
      const granted = await requestSpeechPermission();
      if (!granted) return;
    }

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'ja-JP',
        interimResults: true,
        maxAlternatives: 1,
        contextualStrings: [SHUTTER_TRIGGER_WORD],
        continuous: true,
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: [
            AVAudioSessionCategoryOptions.mixWithOthers,
            AVAudioSessionCategoryOptions.allowBluetooth,
          ],
          mode: 'measurement',
        },
      });
    } catch {
      setListening(false);
    }
  }, [requestSpeechPermission]);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
      ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(false, {
        notifyOthersOnDeactivation: true,
      });
    } catch {
      // The speech module can throw if it is already stopped on some platforms.
    }
    setListening(false);
  }, []);

  useEffect(() => {
    if (active) {
      void start();
      return;
    }

    stop();
  }, [active, start, stop]);

  useEffect(() => {
    return stop;
  }, [stop]);

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    setUnavailable(false);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    if (activeRef.current) {
      setTimeout(() => {
        if (activeRef.current) void start();
      }, SPEECH_RESTART_DELAY_MS);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (activeRef.current && text.includes(SHUTTER_TRIGGER_WORD) && !disabledRef.current) {
      onTriggerRef.current();
    }
  });

  useSpeechRecognitionEvent('error', () => {
    setListening(false);
    setUnavailable(true);
  });

  return {
    listening,
    unavailable,
  };
}
