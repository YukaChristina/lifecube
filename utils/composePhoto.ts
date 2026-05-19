import { Skia, ClipOp, PaintStyle } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import {
  DEFAULT_FRONT_IMAGE_FOCUS,
  type CompositePattern,
  type FrontImageFocus,
  type PhotoOrientation,
} from '@/features/photo-sets/types';
import { makeDiagonalCompositionPaths } from '@/features/photo-sets/diagonal-composition';

const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;
const COMPOSITION_ACCENT_COLOR = '#F3B8C8';

// デザイン定数（パステルカラーと透明度）
const COLORS = {
  diagonal: { color: COMPOSITION_ACCENT_COLOR, opacity: 0.82, width: 4 },
  circle: { color: COMPOSITION_ACCENT_COLOR, opacity: 0.82, width: 4 },
  split: { color: COMPOSITION_ACCENT_COLOR, opacity: 0.82, width: 4 },
} as const;

// 1. 斜めカット用パス
function makeDiagonalPaths(W: number, H: number) {
  const paths = makeDiagonalCompositionPaths(W, H);
  const curve = Skia.Path.MakeFromSVGString(paths.curvePath);
  const outerClip = Skia.Path.MakeFromSVGString(paths.outerClipPath);
  const innerClip = Skia.Path.MakeFromSVGString(paths.innerClipPath);

  if (!curve || !outerClip || !innerClip) {
    throw new Error('斜めカット用パスの作成に失敗しました');
  }

  return { curve, outerClip, innerClip };
}

async function loadSkiaImage(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const data = Skia.Data.fromBase64(base64);
  return Skia.Image.MakeImageFromEncoded(data);
}

/**
 * 指定された領域に中央寄せで描画（Fill/Cover）
 */
/**
 * 指定された領域に中央寄せで描画（Fill/Cover）
 * zoom: 拡大率 (1.0 = ぴったり)
 * offsetPctX: 中央からのずらし具合 (-1.0 〜 1.0)
 */
function drawImageToRect(
  canvas: ReturnType<NonNullable<ReturnType<typeof Skia.Surface.Make>>['getCanvas']>,
  image: NonNullable<ReturnType<typeof Skia.Image.MakeImageFromEncoded>>,
  targetRect: { x: number; y: number; width: number; height: number },
  paint: ReturnType<typeof Skia.Paint>,
  resizeMode: 'cover' | 'contain' = 'cover',
) {
  const iW = image.width();
  const iH = image.height();
  const scaleFn = resizeMode === 'contain' ? Math.min : Math.max;
  const scale = scaleFn(targetRect.width / iW, targetRect.height / iH);
  const dW = iW * scale;
  const dH = iH * scale;
  const drawX = targetRect.x + (targetRect.width - dW) / 2;
  const drawY = targetRect.y + (targetRect.height - dH) / 2;

  canvas.drawImageRect(
    image,
    { x: 0, y: 0, width: iW, height: iH },
    { x: drawX, y: drawY, width: dW, height: dH },
    paint,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawImageToRectWithFocus(
  canvas: ReturnType<NonNullable<ReturnType<typeof Skia.Surface.Make>>['getCanvas']>,
  image: NonNullable<ReturnType<typeof Skia.Image.MakeImageFromEncoded>>,
  targetRect: { x: number; y: number; width: number; height: number },
  paint: ReturnType<typeof Skia.Paint>,
  focus: FrontImageFocus,
  baseZoom: number = 1.0,
  faceAnchor?: { x: number; y: number },
) {
  const iW = image.width();
  const iH = image.height();
  const safeFocusX = clamp(focus.x, 0, 1);
  const safeFocusY = clamp(focus.y, 0, 1);
  const safeScale = Math.max(0.1, focus.scale);
  const scale = Math.max(targetRect.width / iW, targetRect.height / iH) * baseZoom * safeScale;
  const dW = iW * scale;
  const dH = iH * scale;

  const minX = targetRect.x + targetRect.width - dW;
  const maxX = targetRect.x;
  const minY = targetRect.y + targetRect.height - dH;
  const maxY = targetRect.y;
  const anchorX = faceAnchor?.x ?? (targetRect.x + targetRect.width / 2);
  const anchorY = faceAnchor?.y ?? (targetRect.y + targetRect.height / 2);
  const drawX = clamp(anchorX - dW * safeFocusX, minX, maxX);
  const drawY = clamp(anchorY - dH * safeFocusY, minY, maxY);

  canvas.drawImageRect(
    image,
    { x: 0, y: 0, width: iW, height: iH },
    {
      x: drawX,
      y: drawY,
      width: dW,
      height: dH,
    },
    paint,
  );
}

export function getComposedPhotoSize(orientation: PhotoOrientation) {
  if (orientation === 'landscape') {
    return {
      width: PORTRAIT_HEIGHT,
      height: PORTRAIT_WIDTH,
    };
  }

  return {
    width: PORTRAIT_WIDTH,
    height: PORTRAIT_HEIGHT,
  };
}

export async function composePhotos(
  frontUri: string,
  backUri: string,
  pattern: CompositePattern = 'diagonal',
  orientation: PhotoOrientation = 'portrait',
  frontImageFocus: FrontImageFocus = DEFAULT_FRONT_IMAGE_FOCUS,
): Promise<string> {
  console.log(`[composePhotos] start pattern: ${pattern} orientation: ${orientation}`, { frontUri, backUri });

  const { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT } = getComposedPhotoSize(orientation);

  const [frontImg, backImg] = await Promise.all([
    loadSkiaImage(frontUri),
    loadSkiaImage(backUri),
  ]);
  if (!frontImg || !backImg) throw new Error('画像の読み込みに失敗しました');

  const surface = Skia.Surface.Make(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  if (!surface) throw new Error('Surface の作成に失敗');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();

  switch (pattern) {
    case 'diagonal': {
      const { curve, outerClip, innerClip } = makeDiagonalPaths(OUTPUT_WIDTH, OUTPUT_HEIGHT);
      const style = COLORS.diagonal;

      canvas.save();
      canvas.clipPath(outerClip, ClipOp.Intersect, true);
      drawImageToRect(canvas, backImg, { x: 0, y: 0, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT }, paint, 'contain');
      canvas.restore();

      const isPortrait = OUTPUT_HEIGHT >= OUTPUT_WIDTH;
      const faceAnchor = {
        x: isPortrait ? OUTPUT_WIDTH * 0.75 : OUTPUT_WIDTH * 0.25,
        y: OUTPUT_HEIGHT * 0.75,
      };
      canvas.save();
      canvas.clipPath(innerClip, ClipOp.Intersect, true);
      drawImageToRectWithFocus(canvas, frontImg, { x: 0, y: 0, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT }, paint, frontImageFocus, 1.0, faceAnchor);
      canvas.restore();

      // 境界線
      const linePaint = Skia.Paint();
      linePaint.setStyle(PaintStyle.Stroke);
      linePaint.setStrokeWidth(style.width);
      linePaint.setColor(Skia.Color(style.color));
      linePaint.setAlphaf(style.opacity);
      linePaint.setAntiAlias(true);
      canvas.drawPath(curve, linePaint);
      break;
    }

    case 'circle': {
      const style = COLORS.circle;
      const circleRadius = Math.min(OUTPUT_WIDTH, OUTPUT_HEIGHT) * 0.25;
      const centerX = OUTPUT_WIDTH - circleRadius - OUTPUT_WIDTH * 0.07;
      const centerY = OUTPUT_HEIGHT - circleRadius - OUTPUT_HEIGHT * 0.08;

      // 1. 背面写真を全画面に
      drawImageToRect(canvas, backImg, { x: 0, y: 0, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT }, paint, 'contain');

      // 2. 内側写真を円形でクリップして重ねる
      canvas.save();
      const circlePath = Skia.Path.Make();
      circlePath.addCircle(centerX, centerY, circleRadius);
      canvas.clipPath(circlePath, ClipOp.Intersect, true);
      drawImageToRectWithFocus(
        canvas,
        frontImg,
        {
          x: centerX - circleRadius,
          y: centerY - circleRadius,
          width: circleRadius * 2,
          height: circleRadius * 2,
        },
        paint,
        frontImageFocus,
        1.0,
      );
      canvas.restore();

      // 3. 円の枠線
      const borderPaint = Skia.Paint();
      borderPaint.setStyle(PaintStyle.Stroke);
      borderPaint.setStrokeWidth(style.width);
      borderPaint.setColor(Skia.Color(style.color));
      borderPaint.setAlphaf(style.opacity);
      borderPaint.setAntiAlias(true);
      canvas.drawCircle(centerX, centerY, circleRadius, borderPaint);
      break;
    }

    case 'split': {
      const style = COLORS.split;
      const dividerX = OUTPUT_WIDTH / 2;

      // 左側: 背面写真
      canvas.save();
      canvas.clipRect({ x: 0, y: 0, width: dividerX, height: OUTPUT_HEIGHT }, ClipOp.Intersect, true);
      drawImageToRect(canvas, backImg, { x: 0, y: 0, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT }, paint, 'contain');
      canvas.restore();

      canvas.save();
      canvas.clipRect({ x: dividerX, y: 0, width: dividerX, height: OUTPUT_HEIGHT }, ClipOp.Intersect, true);
      drawImageToRectWithFocus(canvas, frontImg, { x: dividerX, y: 0, width: dividerX, height: OUTPUT_HEIGHT }, paint, frontImageFocus, 1.0);
      canvas.restore();

      // 境界線
      const dividerPaint = Skia.Paint();
      dividerPaint.setStrokeWidth(style.width);
      dividerPaint.setColor(Skia.Color(style.color));
      dividerPaint.setAlphaf(style.opacity);
      canvas.drawLine(dividerX, 0, dividerX, OUTPUT_HEIGHT, dividerPaint);
      break;
    }
  }

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot.encodeToBase64();

  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  const dir = `${baseDirectory}lifecube/composed-preview/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const outputPath = `${dir}photo_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(outputPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outputPath;
}
