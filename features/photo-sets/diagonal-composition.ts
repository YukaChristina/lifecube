export type DiagonalCompositionPaths = {
  curvePath: string;
  outerClipPath: string;
  innerClipPath: string;
};

const CONTROL_NEAR = 0.78;
const CONTROL_FAR = 0.22;

export function makeDiagonalCompositionPaths(
  width: number,
  height: number,
): DiagonalCompositionPaths {
  if (height >= width) {
    const startX = width;
    const startY = 0;
    const endX = 0;
    const endY = height;
    const c1X = width;
    const c1Y = height * CONTROL_NEAR;
    const c2X = 0;
    const c2Y = height * CONTROL_FAR;
    const curvePath = `M ${startX} ${startY} C ${c1X} ${c1Y} ${c2X} ${c2Y} ${endX} ${endY}`;

    return {
      curvePath,
      outerClipPath: `M 0 0 L ${startX} ${startY} C ${c1X} ${c1Y} ${c2X} ${c2Y} ${endX} ${endY} L 0 0 Z`,
      innerClipPath: `M ${startX} ${startY} L ${width} 0 L ${width} ${height} L ${endX} ${endY} C ${c2X} ${c2Y} ${c1X} ${c1Y} ${startX} ${startY} Z`,
    };
  }

  const startX = 0;
  const startY = 0;
  const endX = width;
  const endY = height;
  const c1X = width * CONTROL_NEAR;
  const c1Y = 0;
  const c2X = width * CONTROL_FAR;
  const c2Y = height;
  const curvePath = `M ${startX} ${startY} C ${c1X} ${c1Y} ${c2X} ${c2Y} ${endX} ${endY}`;

  return {
    curvePath,
    outerClipPath: `M ${startX} ${startY} L ${width} 0 L ${endX} ${endY} C ${c2X} ${c2Y} ${c1X} ${c1Y} ${startX} ${startY} Z`,
    innerClipPath: `M ${startX} ${startY} C ${c1X} ${c1Y} ${c2X} ${c2Y} ${endX} ${endY} L 0 ${height} L ${startX} ${startY} Z`,
  };
}
