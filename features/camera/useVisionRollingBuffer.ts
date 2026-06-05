import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useRef, useState } from 'react';
import type { CameraVideoOutput } from 'react-native-vision-camera';

// 5秒チャンク × 最大6本 = 30秒バッファ
const CHUNK_DURATION_SECS = 5;
const MAX_CHUNKS = 6;

export type VisionBufferStatus = {
  isBuffering: boolean;
  chunkCount: number;
  bufferedSecs: number;
};

export function useVisionRollingBuffer(videoOutput: CameraVideoOutput) {
  const [status, setStatus] = useState<VisionBufferStatus>({
    isBuffering: false,
    chunkCount: 0,
    bufferedSecs: 0,
  });

  const isBufferingRef = useRef(false);
  const chunksRef = useRef<string[]>([]);

  const deleteChunk = useCallback(async (path: string) => {
    try {
      // Vision Camera returns a plain path, FileSystem needs file:// URI
      const uri = path.startsWith('file://') ? path : `file://${path}`;
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore
    }
  }, []);

  const recordChunk = useCallback(async (): Promise<string | null> => {
    let recorder;
    try {
      recorder = await videoOutput.createRecorder({});
    } catch (e) {
      console.warn('[VisionBuffer] createRecorder failed:', e);
      return null;
    }

    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout>;

      recorder.startRecording(
        (filePath) => {
          clearTimeout(timer);
          resolve(filePath);
        },
        (error) => {
          clearTimeout(timer);
          console.warn('[VisionBuffer] 録画エラー:', error);
          resolve(null);
        },
      ).then(() => {
        // startRecording が resolve = 録画開始済み → 5秒後に停止
        timer = setTimeout(async () => {
          try {
            await recorder.stopRecording();
          } catch {
            // ignore
          }
        }, CHUNK_DURATION_SECS * 1000);
      }).catch((e) => {
        console.warn('[VisionBuffer] startRecording failed:', e);
        resolve(null);
      });
    });
  }, [videoOutput]);

  const startBuffering = useCallback(async () => {
    if (isBufferingRef.current) return;
    isBufferingRef.current = true;
    setStatus({ isBuffering: true, chunkCount: 0, bufferedSecs: 0 });
    console.log('[VisionBuffer] 開始');

    while (isBufferingRef.current) {
      const path = await recordChunk();

      if (!isBufferingRef.current) {
        if (path) void deleteChunk(path);
        break;
      }

      if (!path) {
        await new Promise<void>(r => setTimeout(r, 1000));
        continue;
      }

      if (chunksRef.current.length >= MAX_CHUNKS) {
        void deleteChunk(chunksRef.current[0]);
        chunksRef.current = chunksRef.current.slice(1);
      }
      chunksRef.current = [...chunksRef.current, path];

      const count = chunksRef.current.length;
      setStatus({ isBuffering: true, chunkCount: count, bufferedSecs: count * CHUNK_DURATION_SECS });
      console.log(`[VisionBuffer] ${count}チャンク / ${count * CHUNK_DURATION_SECS}秒`);
    }

    isBufferingRef.current = false;
    setStatus(s => ({ ...s, isBuffering: false }));
    console.log('[VisionBuffer] 停止');
  }, [recordChunk, deleteChunk]);

  const stopBuffering = useCallback(() => {
    isBufferingRef.current = false;
  }, []);

  const getChunks = useCallback(() => [...chunksRef.current], []);

  const clearChunks = useCallback(async () => {
    const toDelete = [...chunksRef.current];
    chunksRef.current = [];
    setStatus(s => ({ ...s, chunkCount: 0, bufferedSecs: 0 }));
    await Promise.all(toDelete.map(deleteChunk));
  }, [deleteChunk]);

  return { status, startBuffering, stopBuffering, getChunks, clearChunks };
}
