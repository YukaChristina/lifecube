import * as SQLite from 'expo-sqlite';

import type { CompositePattern, PhotoSet, PhotoSetRow } from './types';

const DB_NAME = 'lifecube.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function rowToPhotoSet(row: PhotoSetRow): PhotoSet {
  return {
    id: row.id,
    createdAt: row.created_at,
    backLocalUri: row.back_local_uri,
    frontLocalUri: row.front_local_uri,
    composedLocalUri: row.composed_local_uri,
    composedAssetId: row.composed_asset_id,
    pattern: row.pattern,
    deletedAt: row.deleted_at,
  };
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS photo_sets (
      id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL,
      back_local_uri TEXT,
      front_local_uri TEXT,
      composed_local_uri TEXT NOT NULL,
      composed_asset_id TEXT,
      pattern TEXT NOT NULL,
      deleted_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_photo_sets_created_at
      ON photo_sets (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_photo_sets_deleted_at
      ON photo_sets (deleted_at);
  `);
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
      back_local_uri,
      front_local_uri,
      composed_local_uri,
      composed_asset_id,
      pattern,
      deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    photoSet.id,
    photoSet.createdAt,
    photoSet.backLocalUri,
    photoSet.frontLocalUri,
    photoSet.composedLocalUri,
    photoSet.composedAssetId,
    photoSet.pattern,
    photoSet.deletedAt,
  );
}

export async function listPhotoSets() {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoSetRow>(
    `SELECT
      id,
      created_at,
      back_local_uri,
      front_local_uri,
      composed_local_uri,
      composed_asset_id,
      pattern,
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
      back_local_uri,
      front_local_uri,
      composed_local_uri,
      composed_asset_id,
      pattern,
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
) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE photo_sets SET composed_local_uri = ?, pattern = ? WHERE id = ?',
    composedLocalUri,
    pattern,
    id,
  );
}
