import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useRef, useState } from 'react';
import type { CameraVideoOutput } from 'react-native-vision-camera';

const CHUNK_DURATION_SECS = 5;
const MAX_CHUNKS = 6; // プリ30秒

export type BufferPhase = 'idle' | 'rolling' | 'post-trigger';

export type VisionBufferStatus = {
  phase: BufferPhase;
  chunkCount: number;
  bufferedSecs: number;
  postTriggerSecs: number;
};

export function useVisionRollingBuffer(videoOutput: CameraVideoOutput) {
  const [status, setStatus] = useState<VisionBufferStatus>({
    phase: 'idle',
    chunkCount: 0,
    bufferedSecs: 0,
    postTriggerSecs: 0,
  });

  const isBufferingRef = useRef(false);
  const isPostTriggerRef = useRef(false);
  const postTriggerCountRef = useRef(0);
  const postTriggerResolveRef = useRef<((chunks: string[]) => void) | null>(null);
  const chunksRef = useRef<string[]>([]);

  const deleteChunk = useCallback(async (path: string) => {
    try {
      const uri = path.startsWith('file://') ? path : `file://${path}`;
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore
    }
  }, []);

  const recordChunk = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout>;

      videoOutput.createRecorder({}).then(recorder => {
        return recorder.startRecording(
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
          timer = setTimeout(async () => {
            try { await recorder.stopRecording(); } catch { /* ignore */ }
          }, CHUNK_DURATION_SECS * 1000);
        });
      }).catch(e => {
        console.warn('[VisionBuffer] recorder error:', e);
        resolve(null);
      });
    });
  }, [videoOutput]);

  const startBuffering = useCallback(async () => {
    if (isBufferingRef.current) return;
    isBufferingRef.current = true;
    isPostTriggerRef.current = false;
    postTriggerCountRef.current = 0;
    chunksRef.current = [];
    setStatus({ phase: 'rolling', chunkCount: 0, bufferedSecs: 0, postTriggerSecs: 0 });
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

      if (isPostTriggerRef.current) {
        chunksRef.current = [...chunksRef.current, path];
        postTriggerCountRef.current += 1;
        const postCount = postTriggerCountRef.current;

        setStatus({
          phase: 'post-trigger',
          chunkCount: chunksRef.current.length,
          bufferedSecs: chunksRef.current.length * CHUNK_DURATION_SECS,
          postTriggerSecs: postCount * CHUNK_DURATION_SECS,
        });
        console.log(`[VisionBuffer] ポスト ${postCount}/${MAX_CHUNKS}`);

        if (postCount >= MAX_CHUNKS) {
          isBufferingRef.current = false;
          const allChunks = [...chunksRef.current];
          postTriggerResolveRef.current?.(allChunks);
          postTriggerResolveRef.current = null;
          break;
        }
      } else {
        if (chunksRef.current.length >= MAX_CHUNKS) {
          void deleteChunk(chunksRef.current[0]);
          chunksRef.current = chunksRef.current.slice(1);
        }
        chunksRef.current = [...chunksRef.current, path];
        const count = chunksRef.current.length;
        setStatus({
          phase: 'rolling',
          chunkCount: count,
          bufferedSecs: count * CHUNK_DURATION_SECS,
          postTriggerSecs: 0,
        });
        console.log(`[VisionBuffer] ${count}チャンク / ${count * CHUNK_DURATION_SECS}秒`);
      }
    }

    isPostTriggerRef.current = false;
    isBufferingRef.current = false;
    setStatus(s => ({ ...s, phase: 'idle' }));
    console.log('[VisionBuffer] 停止');
  }, [recordChunk, deleteChunk]);

  const stopBuffering = useCallback(() => {
    isBufferingRef.current = false;
    if (isPostTriggerRef.current && postTriggerResolveRef.current) {
      postTriggerResolveRef.current([...chunksRef.current]);
      postTriggerResolveRef.current = null;
    }
  }, []);

  // トリガー発火時: 現在のバッファを保持してポスト30秒録画し、全チャンクを返す
  const firePostTrigger = useCallback((): Promise<string[]> | null => {
    if (!isBufferingRef.current || isPostTriggerRef.current) return null;
    isPostTriggerRef.current = true;
    postTriggerCountRef.current = 0;
    setStatus(s => ({ ...s, phase: 'post-trigger', postTriggerSecs: 0 }));
    console.log('[VisionBuffer] ポストトリガー開始');
    return new Promise((resolve) => {
      postTriggerResolveRef.current = resolve;
    });
  }, []);

  const getChunks = useCallback(() => [...chunksRef.current], []);

  const clearChunks = useCallback(async () => {
    const toDelete = [...chunksRef.current];
    chunksRef.current = [];
    setStatus(s => ({ ...s, chunkCount: 0, bufferedSecs: 0, postTriggerSecs: 0 }));
    await Promise.all(toDelete.map(deleteChunk));
  }, [deleteChunk]);

  return { status, startBuffering, stopBuffering, firePostTrigger, getChunks, clearChunks };
}
