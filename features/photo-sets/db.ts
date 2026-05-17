import * as SQLite from 'expo-sqlite';

import type { CompositePattern, PhotoSet, PhotoSetRow } from './types';

const DB_NAME = 'lifecube.db';
const SCHEMA_VERSION = 2;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function rowToPhotoSet(row: PhotoSetRow): PhotoSet {
  return {
    id: row.id,
    createdAt: row.created_at,
    captureMode: row.capture_mode,
    orientation: row.orientation,
    backLocalUri: row.back_local_uri,
    frontLocalUri: row.front_local_uri,
    composedLocalUri: row.composed_local_uri,
    composedAssetId: row.composed_asset_id,
    pattern: row.pattern,
    composedWidth: row.composed_width,
    composedHeight: row.composed_height,
    frontImageFocusX: row.front_image_focus_x,
    frontImageFocusY: row.front_image_focus_y,
    frontImageScale: row.front_image_scale,
    deletedAt: row.deleted_at,
  };
}

async function createPhotoSetsTable(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS photo_sets (
      id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL,
      capture_mode TEXT NOT NULL,
      orientation TEXT NOT NULL,
      back_local_uri TEXT,
      front_local_uri TEXT,
      composed_local_uri TEXT NOT NULL,
      composed_asset_id TEXT,
      pattern TEXT,
      composed_width INTEGER NOT NULL,
      composed_height INTEGER NOT NULL,
      front_image_focus_x REAL,
      front_image_focus_y REAL,
      front_image_scale REAL,
      deleted_at INTEGER
    );
  `);
}

async function ensurePhotoSetIndexes(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_photo_sets_created_at
      ON photo_sets (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_photo_sets_deleted_at
      ON photo_sets (deleted_at);
  `);
}

async function getUserVersion(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function photoSetsTableExists(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'photo_sets'",
  );
  return Boolean(row);
}

async function migratePhotoSetsToV2(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    CREATE TABLE photo_sets_v2 (
      id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL,
      capture_mode TEXT NOT NULL,
      orientation TEXT NOT NULL,
      back_local_uri TEXT,
      front_local_uri TEXT,
      composed_local_uri TEXT NOT NULL,
      composed_asset_id TEXT,
      pattern TEXT,
      composed_width INTEGER NOT NULL,
      composed_height INTEGER NOT NULL,
      front_image_focus_x REAL,
      front_image_focus_y REAL,
      front_image_scale REAL,
      deleted_at INTEGER
    );

    INSERT INTO photo_sets_v2 (
      id,
      created_at,
      capture_mode,
      orientation,
      back_local_uri,
      front_local_uri,
      composed_local_uri,
      composed_asset_id,
      pattern,
      composed_width,
      composed_height,
      front_image_focus_x,
      front_image_focus_y,
      front_image_scale,
      deleted_at
    )
    SELECT
      id,
      created_at,
      'dual',
      'portrait',
      back_local_uri,
      front_local_uri,
      composed_local_uri,
      composed_asset_id,
      pattern,
      1080,
      1920,
      0.5,
      0.5,
      1.0,
      deleted_at
    FROM photo_sets;

    DROP TABLE photo_sets;
    ALTER TABLE photo_sets_v2 RENAME TO photo_sets;

    PRAGMA user_version = ${SCHEMA_VERSION};
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

async function migrate(db: SQLite.SQLiteDatabase) {
  const tableExists = await photoSetsTableExists(db);
  const userVersion = await getUserVersion(db);

  if (!tableExists) {
    await createPhotoSetsTable(db);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  } else if (userVersion < SCHEMA_VERSION) {
    await migratePhotoSetsToV2(db);
  }

  await ensurePhotoSetIndexes(db);
}

async function getDb() {
  dbPromise ??= SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
    await migrate(db);
    return db;
  });

  return dbPromise;
}

export async function insertPhotoSet(photoSet: PhotoSet) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO photo_sets (
      id,
      created_at,
      capture_mode,
      orientation,
      back_local_uri,
      front_local_uri,
      composed_local_uri,
      composed_asset_id,
      pattern,
      composed_width,
      composed_height,
      front_image_focus_x,
      front_image_focus_y,
      front_image_scale,
      deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    photoSet.id,
    photoSet.createdAt,
    photoSet.captureMode,
    photoSet.orientation,
    photoSet.backLocalUri,
    photoSet.frontLocalUri,
    photoSet.composedLocalUri,
    photoSet.composedAssetId,
    photoSet.pattern,
    photoSet.composedWidth,
    photoSet.composedHeight,
    photoSet.frontImageFocusX,
    photoSet.frontImageFocusY,
    photoSet.frontImageScale,
    photoSet.deletedAt,
  );
}

export async function listPhotoSets() {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoSetRow>(
    `SELECT
      id,
      created_at,
      capture_mode,
      orientation,
      back_local_uri,
      front_local_uri,
      composed_local_uri,
      composed_asset_id,
      pattern,
      composed_width,
      composed_height,
      front_image_focus_x,
      front_image_focus_y,
      front_image_scale,
      deleted_at
    FROM photo_sets
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC`,
  );

  return rows.map(rowToPhotoSet);
}

export async function getPhotoSetById(id: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<PhotoSetRow>(
    `SELECT
      id,
      created_at,
      capture_mode,
      orientation,
      back_local_uri,
      front_local_uri,
      composed_local_uri,
      composed_asset_id,
      pattern,
      composed_width,
      composed_height,
      front_image_focus_x,
      front_image_focus_y,
      front_image_scale,
      deleted_at
    FROM photo_sets
    WHERE id = ? AND deleted_at IS NULL`,
    id,
  );

  return row ? rowToPhotoSet(row) : null;
}

export async function markPhotoSetDeleted(id: string, deletedAt = Date.now()) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE photo_sets SET deleted_at = ? WHERE id = ?',
    deletedAt,
    id,
  );
}

export async function updatePhotoSetComposed(
  id: string,
  composedLocalUri: string,
  pattern: CompositePattern,
  composedWidth: number,
  composedHeight: number,
) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE photo_sets
     SET composed_local_uri = ?, pattern = ?, composed_width = ?, composed_height = ?
     WHERE id = ?`,
    composedLocalUri,
    pattern,
    composedWidth,
    composedHeight,
    id,
  );
}
