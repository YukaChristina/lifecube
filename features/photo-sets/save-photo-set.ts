import { Image } from 'react-native';

import { insertPhotoSet, markPhotoSetDeleted } from './db';
import {
  copyPhotoSetFiles,
  deletePhotoSetLocalFiles,
  saveComposedToMediaLibrary,
} from './storage';
import type { PhotoSet, SavePhotoSetInput } from './types';

function createPhotoSetId(createdAt: number) {
  const timestamp = new Date(createdAt)
    .toISOString()
    .replace(/\D/g, '')
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${timestamp}_${suffix}`;
}

function getImageSize(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

function getFallbackComposedSize(orientation: SavePhotoSetInput['orientation']) {
  if (orientation === 'landscape') {
    return { width: 1920, height: 1080 };
  }

  return { width: 1080, height: 1920 };
}

export async function savePhotoSet({
  backUri,
  frontUri,
  composedUri,
  captureMode,
  orientation,
  pattern,
  frontImageFocus,
}: SavePhotoSetInput): Promise<PhotoSet> {
  const createdAt = Date.now();
  const id = createPhotoSetId(createdAt);
  const storedFiles = await copyPhotoSetFiles({
    id,
    backUri,
    frontUri,
    composedUri,
    captureMode,
  });
  const composedSize = await getImageSize(storedFiles.composedLocalUri)
    .catch(() => getFallbackComposedSize(orientation));
  const composedAssetId = await saveComposedToMediaLibrary(storedFiles.composedLocalUri);

  const photoSet: PhotoSet = {
    id,
    createdAt,
    captureMode,
    orientation,
    backLocalUri: storedFiles.backLocalUri,
    frontLocalUri: storedFiles.frontLocalUri,
    composedLocalUri: storedFiles.composedLocalUri,
    composedAssetId,
    pattern,
    composedWidth: composedSize.width,
    composedHeight: composedSize.height,
    frontImageFocusX: frontImageFocus?.x ?? null,
    frontImageFocusY: frontImageFocus?.y ?? null,
    frontImageScale: frontImageFocus?.scale ?? null,
    deletedAt: null,
  };

  await insertPhotoSet(photoSet);

  return photoSet;
}

export async function deleteSavedPhotoSet(photoSet: Pick<PhotoSet, 'id'>) {
  await markPhotoSetDeleted(photoSet.id);
  await deletePhotoSetLocalFiles(photoSet.id);
}
