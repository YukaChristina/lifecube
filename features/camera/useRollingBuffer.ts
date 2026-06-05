import { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useRef, useState } from 'react';

// 1.5秒間隔で撮影、最大20枚（= 30秒分）を保持
const INTERVAL_MS = 1500;
const MAX_PHOTOS = 20;

export type RollingBufferStatus = {
  isBuffering: boolean;
  photoCount: number;
  bufferedSecs: number;
};

export function useRollingBuffer(
  cameraRef: React.RefObject<CameraView | null>,
  isCapturingRef: React.RefObject<boolean>,
) {
  const [status, setStatus] = useState<RollingBufferStatus>({
    isBuffering: false,
    photoCount: 0,
    bufferedSecs: 0,
  });

  const isBufferingRef = useRef(false);
  const photosRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deletePhoto = useCallback(async (uri: string) => {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore
    }
  }, []);

  const captureOne = useCallback(async () => {
    if (!isBufferingRef.current) return;

    // 通常撮影と競合しないようスキップ
    if (isCapturingRef.current) {
      timerRef.current = setTimeout(captureOne, INTERVAL_MS);
      return;
    }

    try {
      const result = await cameraRef.current?.takePictureAsync({
        quality: 0.6,
      });

      if (result?.uri) {
        // 古い写真を削除してリングバッファを更新
        if (photosRef.current.length >= MAX_PHOTOS) {
          void deletePhoto(photosRef.current[0]);
          photosRef.current = photosRef.current.slice(1);
        }
        photosRef.current = [...photosRef.current, result.uri];

        const count = photosRef.current.length;
        setStatus({
          isBuffering: true,
          photoCount: count,
          bufferedSecs: Math.round(count * INTERVAL_MS / 1000),
        });
        console.log(`[RollingBuffer] ${count}枚 / ${Math.round(count * INTERVAL_MS / 1000)}秒`);
      }
    } catch (e) {
      console.warn('[RollingBuffer] 撮影エラー:', e);
    }

    // 次の撮影をスケジュール
    if (isBufferingRef.current) {
      timerRef.current = setTimeout(captureOne, INTERVAL_MS);
    }
  }, [cameraRef, deletePhoto]);

  const startBuffering = useCallback(async () => {
    if (isBufferingRef.current) return;
    isBufferingRef.current = true;
    setStatus({ isBuffering: true, photoCount: 0, bufferedSecs: 0 });
    console.log('[RollingBuffer] 開始');
    void captureOne();
  }, [captureOne]);

  const stopBuffering = useCallback(() => {
    isBufferingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus(s => ({ ...s, isBuffering: false }));
    console.log('[RollingBuffer] 停止');
  }, []);

  const getPhotos = useCallback(() => [...photosRef.current], []);

  const clearPhotos = useCallback(async () => {
    const toDelete = [...photosRef.current];
    photosRef.current = [];
    setStatus(s => ({ ...s, photoCount: 0, bufferedSecs: 0 }));
    await Promise.all(toDelete.map(deletePhoto));
  }, [deletePhoto]);

  return { status, startBuffering, stopBuffering, getPhotos, clearPhotos };
}
