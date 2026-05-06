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

export async function savePhotoSet({
  backUri,
  frontUri,
  composedUri,
  pattern,
}: SavePhotoSetInput): Promise<PhotoSet> {
  const createdAt = Date.now();
  const id = createPhotoSetId(createdAt);
  const storedFiles = await copyPhotoSetFiles({
    id,
    backUri,
    frontUri,
    composedUri,
  });
  const composedAssetId = await saveComposedToMediaLibrary(storedFiles.composedLocalUri);

  const photoSet: PhotoSet = {
    id,
    createdAt,
    backLocalUri: storedFiles.backLocalUri,
    frontLocalUri: storedFiles.frontLocalUri,
    composedLocalUri: storedFiles.composedLocalUri,
    composedAssetId,
    pattern,
    deletedAt: null,
  };

  await insertPhotoSet(photoSet);

  return photoSet;
}

export async function deleteSavedPhotoSet(photoSet: Pick<PhotoSet, 'id'>) {
  await markPhotoSetDeleted(photoSet.id);
  await deletePhotoSetLocalFiles(photoSet.id);
}
