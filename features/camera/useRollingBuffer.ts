import { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useRef, useState } from 'react';

const CHUNK_DURATION_SECS = 5;
const MAX_CHUNKS = 6; // 30秒分

export type RollingBufferStatus = {
  isBuffering: boolean;
  chunkCount: number;
  bufferedSecs: number;
};

export function useRollingBuffer(cameraRef: React.RefObject<CameraView | null>) {
  const [status, setStatus] = useState<RollingBufferStatus>({
    isBuffering: false,
    chunkCount: 0,
    bufferedSecs: 0,
  });

  const isBufferingRef = useRef(false);
  const chunksRef = useRef<string[]>([]);

  const deleteChunk = useCallback(async (uri: string) => {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore
    }
  }, []);

  const startBuffering = useCallback(async () => {
    if (isBufferingRef.current) return;
    isBufferingRef.current = true;
    setStatus({ isBuffering: true, chunkCount: 0, bufferedSecs: 0 });
    console.log('[RollingBuffer] 開始');

    while (isBufferingRef.current) {
      try {
        console.log('[RollingBuffer] チャンク録画開始');
        const result = await cameraRef.current?.recordAsync({
          maxDuration: CHUNK_DURATION_SECS,
        });

        if (!result?.uri) {
          console.warn('[RollingBuffer] チャンク取得失敗');
          break;
        }

        console.log('[RollingBuffer] チャンク完了:', result.uri);

        // 古いチャンクを削除してリングバッファを更新
        if (chunksRef.current.length >= MAX_CHUNKS) {
          void deleteChunk(chunksRef.current[0]);
          chunksRef.current = chunksRef.current.slice(1);
        }

        chunksRef.current = [...chunksRef.current, result.uri];
        const count = chunksRef.current.length;
        setStatus({
          isBuffering: true,
          chunkCount: count,
          bufferedSecs: count * CHUNK_DURATION_SECS,
        });
      } catch (e) {
        console.warn('[RollingBuffer] エラー:', e);
        break;
      }
    }

    isBufferingRef.current = false;
    setStatus(s => ({ ...s, isBuffering: false }));
    console.log('[RollingBuffer] 停止');
  }, [cameraRef, deleteChunk]);

  const stopBuffering = useCallback(() => {
    isBufferingRef.current = false;
    try {
      cameraRef.current?.stopRecording();
    } catch {
      // ignore
    }
  }, [cameraRef]);

  const getChunks = useCallback(() => [...chunksRef.current], []);

  return { status, startBuffering, stopBuffering, getChunks };
}
