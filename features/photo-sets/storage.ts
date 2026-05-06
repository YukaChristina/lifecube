import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const PHOTO_SET_ROOT_DIR = 'lifecube/photo-sets/';

type CopyPhotoSetFilesInput = {
  id: string;
  backUri: string;
  frontUri: string;
  composedUri: string;
};

export type StoredPhotoSetFiles = {
  backLocalUri: string;
  frontLocalUri: string;
  composedLocalUri: string;
};

function assertDocumentDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('アプリ内保存領域を取得できませんでした');
  }
}

export function getPhotoSetDirectory(id: string) {
  assertDocumentDirectory();
  return `${FileSystem.documentDirectory}${PHOTO_SET_ROOT_DIR}${id}/`;
}

export async function copyPhotoSetFiles({
  id,
  backUri,
  frontUri,
  composedUri,
}: CopyPhotoSetFilesInput): Promise<StoredPhotoSetFiles> {
  const photoSetDirectory = getPhotoSetDirectory(id);
  await FileSystem.makeDirectoryAsync(photoSetDirectory, { intermediates: true });

  const backLocalUri = `${photoSetDirectory}back.jpg`;
  const frontLocalUri = `${photoSetDirectory}front.jpg`;
  const composedLocalUri = `${photoSetDirectory}composed.png`;

  await Promise.all([
    FileSystem.copyAsync({ from: backUri, to: backLocalUri }),
    FileSystem.copyAsync({ from: frontUri, to: frontLocalUri }),
    FileSystem.copyAsync({ from: composedUri, to: composedLocalUri }),
  ]);

  return {
    backLocalUri,
    frontLocalUri,
    composedLocalUri,
  };
}

export async function saveComposedToMediaLibrary(composedLocalUri: string) {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      return null;
    }

    const asset = await MediaLibrary.createAssetAsync(composedLocalUri);
    return asset.id;
  } catch {
    return null;
  }
}

export async function deletePhotoSetLocalFiles(id: string) {
  try {
    await FileSystem.deleteAsync(getPhotoSetDirectory(id), { idempotent: true });
  } catch {
    // Best-effort cleanup. DB visibility is controlled by deletedAt.
  }
}
