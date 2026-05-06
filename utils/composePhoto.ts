import { Skia, ClipOp, PaintStyle } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

const CX1 = 0;
const CY1 = OUTPUT_HEIGHT * 0.33;
const CX2 = OUTPUT_WIDTH;
const CY2 = OUTPUT_HEIGHT * 0.67;
const START_X = OUTPUT_WIDTH * 0.33;
const END_X = OUTPUT_WIDTH * 0.67;

function makeCurvePath() {
  const path = Skia.Path.Make();
  path.moveTo(START_X, 0);
  path.cubicTo(CX1, CY1, CX2, CY2, END_X, OUTPUT_HEIGHT);
  return path;
}

function makeLeftClip() {
  const path = Skia.Path.Make();
  path.moveTo(0, 0);
  path.lineTo(START_X, 0);
  path.cubicTo(CX1, CY1, CX2, CY2, END_X, OUTPUT_HEIGHT);
  path.lineTo(0, OUTPUT_HEIGHT);
  path.close();
  return path;
}

function makeRightClip() {
  const path = Skia.Path.Make();
  path.moveTo(START_X, 0);
  path.lineTo(OUTPUT_WIDTH, 0);
  path.lineTo(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  path.lineTo(END_X, OUTPUT_HEIGHT);
  path.cubicTo(CX2, CY2, CX1, CY1, START_X, 0);
  path.close();
  return path;
}

async function loadSkiaImage(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const data = Skia.Data.fromBase64(base64);
  return Skia.Image.MakeImageFromEncoded(data);
}

function drawCentered(
  canvas: ReturnType<NonNullable<ReturnType<typeof Skia.Surface.Make>>['getCanvas']>,
  image: NonNullable<ReturnType<typeof Skia.Image.MakeImageFromEncoded>>,
  paint: ReturnType<typeof Skia.Paint>,
) {
  const iW = image.width();
  const iH = image.height();
  const scale = Math.max(OUTPUT_WIDTH / iW, OUTPUT_HEIGHT / iH);
  const dW = iW * scale;
  const dH = iH * scale;
  canvas.drawImageRect(
    image,
    { x: 0, y: 0, width: iW, height: iH },
    {
      x: (OUTPUT_WIDTH - dW) / 2,
      y: (OUTPUT_HEIGHT - dH) / 2,
      width: dW,
      height: dH,
    },
    paint,
  );
}

export async function composePhotos(
  frontUri: string,
  backUri: string,
): Promise<string> {
  console.log('[composePhotos] start', { frontUri, backUri });

  const [frontImg, backImg] = await Promise.all([
    loadSkiaImage(frontUri),
    loadSkiaImage(backUri),
  ]);
  if (!frontImg) throw new Error('frontImg の読み込みに失敗');
  if (!backImg) throw new Error('backImg の読み込みに失敗');
  console.log('[composePhotos] images loaded', frontImg.width(), frontImg.height());

  const surface = Skia.Surface.Make(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  if (!surface) throw new Error('Surface の作成に失敗');
  const canvas = surface.getCanvas();

  const paint = Skia.Paint();

  canvas.save();
  canvas.clipPath(makeRightClip(), ClipOp.Intersect, true);
  drawCentered(canvas, backImg, paint);
  canvas.restore();

  canvas.save();
  canvas.clipPath(makeLeftClip(), ClipOp.Intersect, true);
  drawCentered(canvas, frontImg, paint);
  canvas.restore();

  const linePaint = Skia.Paint();
  linePaint.setStyle(PaintStyle.Stroke);
  linePaint.setStrokeWidth(4);
  linePaint.setColor(Skia.Color('#F3B8C8'));
  linePaint.setAntiAlias(true);
  canvas.drawPath(makeCurvePath(), linePaint);

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot.encodeToBase64();
  console.log('[composePhotos] encoded, length:', base64.length);

  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDirectory) throw new Error('合成画像の保存先を取得できません');

  const dir = `${baseDirectory}lifecube/composed-preview/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const outputPath = `${dir}photo_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(outputPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  console.log('[composePhotos] saved to', outputPath);

  return outputPath;
}
