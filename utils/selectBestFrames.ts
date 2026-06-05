import { getThumbnailAsync } from 'expo-video-thumbnails';

export type ExtractedFrame = {
  uri: string;
  timeMs: number; // クリップ全体での経過時間
};

// 各チャンクの中間フレームを1枚抽出（5秒チャンクなら2.5秒地点）
export async function extractFramesFromChunks(
  chunkPaths: string[],
  chunkDurationSecs: number = 5,
): Promise<ExtractedFrame[]> {
  const frames: ExtractedFrame[] = [];
  const midPointMs = (chunkDurationSecs * 1000) / 2;

  for (let i = 0; i < chunkPaths.length; i++) {
    const path = chunkPaths[i];
    const uri = path.startsWith('file://') ? path : `file://${path}`;
    try {
      const { uri: frameUri } = await getThumbnailAsync(uri, {
        time: midPointMs,
        quality: 0.8,
      });
      frames.push({
        uri: frameUri,
        timeMs: i * chunkDurationSecs * 1000 + midPointMs,
      });
    } catch (e) {
      console.warn(`[extractFrames] chunk ${i} 抽出失敗:`, e);
    }
  }

  return frames;
}

// 時系列に分散した3枚を選ぶ（前半・中盤・後半）
export function selectBestFrames(frames: ExtractedFrame[], count: number = 3): ExtractedFrame[] {
  if (frames.length === 0) return [];
  if (frames.length <= count) return frames;

  const selected: ExtractedFrame[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (frames.length - 1));
    selected.push(frames[idx]);
  }
  return selected;
}
