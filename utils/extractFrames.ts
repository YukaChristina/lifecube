import * as VideoThumbnails from 'expo-video-thumbnails';

export type ExtractedFrame = {
  uri: string;
  timeMs: number;
};

/**
 * 動画から指定間隔でフレームを抽出する
 * @param videoUri 動画ファイルのURI
 * @param durationMs 動画の長さ（ミリ秒）
 * @param intervalMs フレーム抽出間隔（ミリ秒）
 */
export async function extractFrames(
  videoUri: string,
  durationMs: number,
  intervalMs: number = 1000,
): Promise<ExtractedFrame[]> {
  const frames: ExtractedFrame[] = [];
  const timeMs = 0;

  for (let t = 0; t <= durationMs; t += intervalMs) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: t,
        quality: 0.8,
      });
      frames.push({ uri, timeMs: t });
    } catch {
      // 抽出失敗したフレームはスキップ
    }
  }

  return frames;
}
