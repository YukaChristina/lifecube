import * as FileSystem from 'expo-file-system/legacy';
import { CompositePattern } from '@/features/photo-sets/types';

const SETTINGS_FILE = `${FileSystem.documentDirectory}settings.json`;

type Settings = {
  defaultPattern: CompositePattern;
};

const DEFAULT_SETTINGS: Settings = {
  defaultPattern: 'diagonal',
};

export async function loadSettings(): Promise<Settings> {
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (!info.exists) {
      return DEFAULT_SETTINGS;
    }
    const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  try {
    const current = await loadSettings();
    const next = { ...current, ...settings };
    await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(next));
  } catch (error) {
    console.error('[saveSettings] error:', error);
  }
}
