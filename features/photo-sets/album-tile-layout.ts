import type { PhotoSet } from './types';

export const ALBUM_GRID_COLUMNS = 4;

export type AlbumTileLayout = {
  photoSet: PhotoSet;
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
};

export type AlbumGridLayout = {
  tiles: AlbumTileLayout[];
  rowCount: number;
  columnCount: number;
};

type TileSpan = {
  rowSpan: number;
  columnSpan: number;
};

type GridCell = boolean;

function getTileSpan(_photoSet: PhotoSet): TileSpan {
  return { rowSpan: 1, columnSpan: 1 };
}

function ensureRows(grid: GridCell[][], rowCount: number, columnCount: number) {
  while (grid.length < rowCount) {
    grid.push(Array.from({ length: columnCount }, () => false));
  }
}

function canPlaceTile(
  grid: GridCell[][],
  row: number,
  column: number,
  span: TileSpan,
  columnCount: number,
) {
  if (column + span.columnSpan > columnCount) return false;

  ensureRows(grid, row + span.rowSpan, columnCount);

  for (let rowOffset = 0; rowOffset < span.rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < span.columnSpan; columnOffset += 1) {
      if (grid[row + rowOffset][column + columnOffset]) return false;
    }
  }

  return true;
}

function placeTile(
  grid: GridCell[][],
  row: number,
  column: number,
  span: TileSpan,
  columnCount: number,
) {
  ensureRows(grid, row + span.rowSpan, columnCount);

  for (let rowOffset = 0; rowOffset < span.rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < span.columnSpan; columnOffset += 1) {
      grid[row + rowOffset][column + columnOffset] = true;
    }
  }
}

function findNextFreeCell(
  grid: GridCell[][],
  startRow: number,
  startColumn: number,
  columnCount: number,
) {
  for (let row = startRow; ; row += 1) {
    ensureRows(grid, row + 1, columnCount);
    const firstColumn = row === startRow ? startColumn : 0;

    for (let column = firstColumn; column < columnCount; column += 1) {
      if (!grid[row][column]) {
        return { row, column };
      }
    }
  }
}

function findNextTilePosition(
  grid: GridCell[][],
  span: TileSpan,
  startRow: number,
  startColumn: number,
  columnCount: number,
) {
  for (let row = startRow; ; row += 1) {
    const firstColumn = row === startRow ? startColumn : 0;

    for (
      let column = firstColumn;
      column <= columnCount - span.columnSpan;
      column += 1
    ) {
      if (canPlaceTile(grid, row, column, span, columnCount)) {
        return { row, column };
      }
    }
  }
}

export function createAlbumGridLayout(
  photoSets: PhotoSet[],
  columnCount = ALBUM_GRID_COLUMNS,
): AlbumGridLayout {
  const grid: GridCell[][] = [];
  const tiles: AlbumTileLayout[] = [];
  let cursorRow = 0;
  let cursorColumn = 0;
  let rowCount = 0;

  for (const photoSet of photoSets) {
    const span = getTileSpan(photoSet);
    const position = findNextTilePosition(
      grid,
      span,
      cursorRow,
      cursorColumn,
      columnCount,
    );

    placeTile(grid, position.row, position.column, span, columnCount);

    tiles.push({
      photoSet,
      row: position.row,
      column: position.column,
      rowSpan: span.rowSpan,
      columnSpan: span.columnSpan,
    });

    rowCount = Math.max(rowCount, position.row + span.rowSpan);

    const nextCell = findNextFreeCell(
      grid,
      position.row,
      position.column + span.columnSpan,
      columnCount,
    );
    cursorRow = nextCell.row;
    cursorColumn = nextCell.column;
  }

  return {
    tiles,
    rowCount,
    columnCount,
  };
}
