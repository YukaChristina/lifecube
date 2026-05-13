import { Skia, ClipOp, PaintStyle } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import { CompositePattern } from '@/features/photo-sets/types';

const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;

// デザイン定数（パステルカラーと透明度）
const COLORS = {
  diagonal: { color: '#F3B8C8', opacity: 0.82, width: 4 },
  circle: { color: '#C8DFF2', opacity: 0.86, width: 4 },
  split: { color: '#C7E6DC', opacity: 0.88, width: 6 },
} as const;

// 1. 斜めカット用パス
function makeDiagonalPaths(W: number, H: number) {
  const OUTPUT_WIDTH = W;
  const OUTPUT_HEIGHT = H;
  const cx1 = 0;
  const cy1 = OUTPUT_HEIGHT * 0.33;
  const cx2 = OUTPUT_WIDTH;
  const cy2 = OUTPUT_HEIGHT * 0.67;
  const startX = OUTPUT_WIDTH * 0.33;
  const endX = OUTPUT_WIDTH * 0.67;

  const curve = Skia.Path.Make();
  curve.moveTo(startX, 0);
  curve.cubicTo(cx1, cy1, cx2, cy2, endX, OUTPUT_HEIGHT);

  const leftClip = Skia.Path.Make();
  leftClip.moveTo(0, 0);
  leftClip.lineTo(startX, 0);
  leftClip.cubicTo(cx1, cy1, cx2, cy2, endX, OUTPUT_HEIGHT);
  leftClip.lineTo(0, OUTPUT_HEIGHT);
  leftClip.close();

  const rightClip = Skia.Path.Make();
  rightClip.moveTo(startX, 0);
  rightClip.lineTo(OUTPUT_WIDTH, 0);
  rightClip.lineTo(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  rightClip.lineTo(endX, OUTPUT_HEIGHT);
  rightClip.cubicTo(cx2, cy2, cx1, cy1, startX, 0);
  rightClip.close();

  return { curve, leftClip, rightClip };
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
  offsetPctX: number = 0,
  zoom: number = 1.0,
) {
  const iW = image.width();
  const iH = image.height();
  const scale = Math.max(targetRect.width / iW, targetRect.height / iH) * zoom;
  const dW = iW * scale;
  const dH = iH * scale;
  
  // 基本の中央位置
  let drawX = targetRect.x + (targetRect.width - dW) / 2;
  const drawY = targetRect.y + (targetRect.height - dH) / 2;

  // オフセット適用（余白がある場合のみ）
  if (dW > targetRect.width) {
    const maxOffset = (dW - targetRect.width) / 2;
    drawX += maxOffset * offsetPctX;
  }

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

export async function composePhotos(
  frontUri: string,
  backUri: string,
  pattern: CompositePattern = 'diagonal',
  orientation: 'portrait' | 'landscape' = 'portrait',
): Promise<string> {
  console.log(`[composePhotos] start pattern: ${pattern} orientation: ${orientation}`, { frontUri, backUri });

  const OUTPUT_WIDTH = orientation === 'landscape' ? PORTRAIT_HEIGHT : PORTRAIT_WIDTH;
  const OUTPUT_HEIGHT = orientation === 'landscape' ? PORTRAIT_WIDTH : PORTRAIT_HEIGHT;

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
      const { curve, leftClip, rightClip } = makeDiagonalPaths(OUTPUT_WIDTH, OUTPUT_HEIGHT);
      const style = COLORS.diagonal;

      // 背面写真 (右/後): 1.2倍ズームして右に寄せる
      canvas.save();
      canvas.clipPath(rightClip, ClipOp.Intersect, true);
      drawImageToRect(canvas, backImg, { x: 0, y: 0, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT }, paint, 0.8, 1.2);
      canvas.restore();

      // 前面写真 (左/前): 1.2倍ズームして左に寄せる
      canvas.save();
      canvas.clipPath(leftClip, ClipOp.Intersect, true);
      drawImageToRect(canvas, frontImg, { x: 0, y: 0, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT }, paint, -0.8, 1.2);
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
      drawImageToRect(canvas, backImg, { x: 0, y: 0, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT }, paint);

      // 2. 内側写真を円形でクリップして重ねる
      canvas.save();
      const circlePath = Skia.Path.Make();
      circlePath.addCircle(centerX, centerY, circleRadius);
      canvas.clipPath(circlePath, ClipOp.Intersect, true);
      // 円形の中も中央寄せにする
      drawImageToRect(canvas, frontImg, { 
        x: centerX - circleRadius, 
        y: centerY - circleRadius, 
        width: circleRadius * 2, 
        height: circleRadius * 2 
      }, paint, 0, 1.1); // 少しだけズームして中央を強調
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
      drawImageToRect(canvas, backImg, { x: 0, y: 0, width: dividerX, height: OUTPUT_HEIGHT }, paint, 0.4, 1.1);
      canvas.restore();

      // 右側: 前面写真
      canvas.save();
      canvas.clipRect({ x: dividerX, y: 0, width: dividerX, height: OUTPUT_HEIGHT }, ClipOp.Intersect, true);
      drawImageToRect(canvas, frontImg, { x: dividerX, y: 0, width: dividerX, height: OUTPUT_HEIGHT }, paint, -0.4, 1.1);
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
