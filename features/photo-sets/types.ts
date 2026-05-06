export type CompositePattern = 'diagonal' | 'circle' | 'split';

export type PhotoSet = {
  id: string;
  createdAt: number;
  backLocalUri: string | null;
  frontLocalUri: string | null;
  composedLocalUri: string;
  composedAssetId: string | null;
  pattern: CompositePattern;
  deletedAt: number | null;
};

export type SavePhotoSetInput = {
  backUri: string;
  frontUri: string;
  composedUri: string;
  pattern: CompositePattern;
};

export type PhotoSetRow = {
  id: string;
  created_at: number;
  back_local_uri: string | null;
  front_local_uri: string | null;
  composed_local_uri: string;
  composed_asset_id: string | null;
  pattern: CompositePattern;
  deleted_at: number | null;
};
