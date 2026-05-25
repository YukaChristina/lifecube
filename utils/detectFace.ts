import { Image } from 'react-native';
import { RNMLKitFaceDetector } from '@infinitered/react-native-mlkit-face-detection';
import { DEFAULT_FRONT_IMAGE_FOCUS, type FrontImageFocus } from '@/features/photo-sets/types';

let detector: RNMLKitFaceDetector | null = null;
let initPromise: Promise<void> | null = null;

function getDetector(): RNMLKitFaceDetector {
  if (!detector) {
    detector = new RNMLKitFaceDetector({ performanceMode: 'fast' }, true);
    initPromise = detector.initialize();
  }
  return detector;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export async function detectFaceFocus(imageUri: string): Promise<FrontImageFocus> {
  try {
    const det = getDetector();
    await initPromise;
    const [result, imageSize] = await Promise.all([
      det.detectFaces(imageUri),
      getImageSize(imageUri),
    ]);

    if (!result?.faces?.length) return DEFAULT_FRONT_IMAGE_FOCUS;

    const largest = result.faces.reduce((best, face) => {
      const area = face.frame.size.x * face.frame.size.y;
      const bestArea = best.frame.size.x * best.frame.size.y;
      return area > bestArea ? face : best;
    });

    const { frame } = largest;
    const centerX = frame.origin.x + frame.size.x / 2;
    const centerY = frame.origin.y + frame.size.y / 2;

    const x = centerX / imageSize.width;
    const y = centerY / imageSize.height;

    return { x, y, scale: 1.0 };
  } catch {
    return DEFAULT_FRONT_IMAGE_FOCUS;
  }
}
