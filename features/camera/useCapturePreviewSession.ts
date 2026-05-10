import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Share } from 'react-native';

import { deleteSavedPhotoSet, savePhotoSet } from '@/features/photo-sets/save-photo-set';
import type { CompositePattern, PhotoSet } from '@/features/photo-sets/types';
import { composePhotos } from '@/utils/composePhoto';
import { loadSettings } from '@/utils/settings';

import type { CapturedPhotoPair } from './types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const PREVIEW_CLOSE_DELAY_MS = 4000;

type UseCapturePreviewSessionOptions = {
  onPreviewStart: () => void;
  onReturnToCamera: () => void;
};

async function deleteLocalUri(uri: string | null | undefined) {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort cleanup. Camera reset should not be blocked by file cleanup.
  }
}

export function useCapturePreviewSession({
  onPreviewStart,
  onReturnToCamera,
}: UseCapturePreviewSessionOptions) {
  const [photos, setPhotos] = useState<CapturedPhotoPair | null>(null);
  const [composedUri, setComposedUri] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedPhotoSet, setSavedPhotoSet] = useState<PhotoSet | null>(null);
  const activePatternRef = useRef<CompositePattern>('diagonal');
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSessionRef = useRef(0);
  const deleteRequestedSessionsRef = useRef<Set<number>>(new Set());

  const clearPreviewTimer = useCallback(() => {
    if (!previewTimerRef.current) return;
    clearTimeout(previewTimerRef.current);
    previewTimerRef.current = null;
  }, []);

  const returnToCamera = useCallback(() => {
    previewSessionRef.current += 1;
    clearPreviewTimer();
    setPhotos(null);
    setComposedUri(null);
    setSaveStatus('idle');
    setSavedPhotoSet(null);
    onReturnToCamera();
  }, [clearPreviewTimer, onReturnToCamera]);

  const schedulePreviewClose = useCallback(() => {
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      returnToCamera();
    }, PREVIEW_CLOSE_DELAY_MS);
  }, [clearPreviewTimer, returnToCamera]);

  const startPreview = useCallback((nextPhotos: CapturedPhotoPair) => {
    onPreviewStart();
    setPhotos(nextPhotos);
  }, [onPreviewStart]);

  useEffect(() => {
    return () => clearPreviewTimer();
  }, [clearPreviewTimer]);

  useEffect(() => {
    if (!photos) {
      setComposedUri(null);
      return;
    }

    const sessionId = previewSessionRef.current + 1;
    previewSessionRef.current = sessionId;
    setSaveStatus('idle');
    setSavedPhotoSet(null);
    setComposedUri(null);
    clearPreviewTimer();
    setIsComposing(true);

    loadSettings().then(settings => {
      activePatternRef.current = settings.defaultPattern;
      return composePhotos(photos.front, photos.back, settings.defaultPattern);
    })
      .then(uri => {
        if (
          previewSessionRef.current === sessionId &&
          !deleteRequestedSessionsRef.current.has(sessionId)
        ) {
          setComposedUri(uri);
          return;
        }

        void deleteLocalUri(uri);
      })
      .catch((err) => {
        if (previewSessionRef.current === sessionId) {
          Alert.alert('エラー', `画像の合成に失敗しました\n${err?.message ?? String(err)}`);
        }
      })
      .finally(() => {
        if (previewSessionRef.current === sessionId) {
          setIsComposing(false);
        }
      });
  }, [clearPreviewTimer, photos]);

  const saveCurrentPhotoSet = useCallback(async (uri: string, sessionId: number) => {
    if (!photos) {
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    try {
      if (deleteRequestedSessionsRef.current.has(sessionId)) {
        return;
      }

      const photoSet = await savePhotoSet({
        backUri: photos.back,
        frontUri: photos.front,
        composedUri: uri,
        pattern: activePatternRef.current,
      });

      if (deleteRequestedSessionsRef.current.has(sessionId)) {
        await deleteSavedPhotoSet(photoSet);
        return;
      }

      if (previewSessionRef.current === sessionId) {
        setSavedPhotoSet(photoSet);
        setSaveStatus('saved');
      }
    } catch {
      if (previewSessionRef.current === sessionId) {
        setSaveStatus('error');
      }
    } finally {
      if (
        previewSessionRef.current === sessionId &&
        !deleteRequestedSessionsRef.current.has(sessionId)
      ) {
        schedulePreviewClose();
      }
    }
  }, [photos, schedulePreviewClose]);

  useEffect(() => {
    if (!composedUri || saveStatus !== 'idle') return;
    void saveCurrentPhotoSet(composedUri, previewSessionRef.current);
  }, [composedUri, saveCurrentPhotoSet, saveStatus]);

  const share = useCallback(async () => {
    const shareUri = savedPhotoSet?.composedLocalUri ?? composedUri;
    if (!shareUri) return;
    clearPreviewTimer();
    await Share.share({
      message: 'LifeCube',
      url: shareUri,
    });
  }, [clearPreviewTimer, composedUri, savedPhotoSet?.composedLocalUri]);

  const deletePreview = useCallback(async () => {
    const sessionId = previewSessionRef.current;
    deleteRequestedSessionsRef.current.add(sessionId);
    clearPreviewTimer();

    if (savedPhotoSet) {
      await deleteSavedPhotoSet(savedPhotoSet);
    }

    await Promise.all([
      deleteLocalUri(composedUri),
      deleteLocalUri(photos?.back),
      deleteLocalUri(photos?.front),
    ]);
    returnToCamera();
  }, [clearPreviewTimer, composedUri, photos?.back, photos?.front, returnToCamera, savedPhotoSet]);

  return {
    composedUri,
    deletePreview,
    isComposing,
    returnToCamera,
    share,
    startPreview,
    visible: photos !== null,
  };
}
