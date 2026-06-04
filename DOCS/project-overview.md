# プロジェクト概要

## 目的

LifeCube は、iOS / Android の両方で動作するインストール可能なモバイルアプリとして開発します。

家族や仲間が一緒に過ごす時間の中で、自然な会話や感情が動いた瞬間を、撮影操作なしに写真として残すことを目指します。

現在の基盤は Expo / React Native です。言語は TypeScript を前提とし、開発は AI コーディングエージェントの支援を大きく取り入れて進めます。

## 現在の技術スタック

- Expo SDK: `~54.0.33`
- React Native: `0.81.5`
- React: `19.1.0`
- TypeScript: `~5.9.2`
- ルーターエントリ: `expo-router/entry`
- ルーティング方針: Expo Router を標準採用
- TypeScript 設定: `strict: true`
- パスエイリアス: `@/*`
- Expo New Architecture: 有効
- Expo typed routes: 有効
- React Compiler experiment: 有効

## 現在のアプリ構成

現在確認できる画面とルートは以下です。

- `app/_layout.tsx`: ルート Stack レイアウト
- `app/(tabs)/_layout.tsx`: タブレイアウト
- `app/(tabs)/index.tsx`: 起動直後に開くカメラ画面
- `app/(tabs)/gallery.tsx`: アルバム一覧画面
- `app/(tabs)/guide.tsx`: ガイド画面
- `app/(tabs)/home.tsx`: ホーム画面
- `app/photo-set/[id].tsx`: アルバム詳細画面
- `app/modal.tsx`: モーダル画面

下部タブは `カメラ / アルバム / ガイド / ホーム` の4つです。

現在コード上に残っている機能領域は以下です。新方針への移行に伴い、合成・前後撮影関連のコードは順次削除します。

**新方針で継続利用するもの**
- `expo-camera` によるカメラ撮影・録画
- `expo-speech-recognition` による音声認識
- `expo-file-system` によるローカルファイル操作
- `expo-media-library` によるメディアライブラリ連携
- `expo-sqlite` による撮影イベント管理用のローカルDB

**新方針で削除予定のもの**
- `@shopify/react-native-skia` による画像合成
- 前後カメラ同時撮影フロー
- 合成パターン（円形・斜め・分割）関連コード
- 顔検出による合成フォーカス補正（`utils/detectFace.ts`）

## 現在のビルド設定

`eas.json` には以下の build profile があります。

- `development`: development client、内部確認用
- `preview`: テストユーザー確認。iOS では TestFlight 配布
- `production`: auto-increment 有効

環境名は Expo / EAS 標準に合わせて `development` / `preview` / `production` に統一します。

`app.config.ts` には EAS project id が設定されています。`APP_VARIANT` によって環境別の bundle identifier / package name を切り替えます。

## 現在見えているリスク

- **ローリングバッファ録画の実現性**: 直近30秒の常時バッファリングは `expo-camera` の標準 API では対応できない可能性があります。チャンク録画による疑似実装、または `react-native-vision-camera` への移行、もしくはネイティブモジュールの追加が必要になる場合があります。技術検証を最優先で行います。
- **フレーム抽出の速度**: 60秒クリップから候補写真を生成するまでの処理時間が、ユーザー体験として許容できるかは実機検証が必要です。
- **複数音声トリガーの誤検知**: 「すごい」「やばい」「きた」など日常語をトリガーにするため、意図しない検知が起きる可能性があります。
- **端末の発熱・バッテリー消費**: 長時間のバッファ録画と音声検知の同時稼働が端末リソースに与える影響を確認する必要があります。
- **DBスキーマの刷新**: 現行のDBは前後撮影セット前提の設計です。トリガー単位の管理に刷新する必要があります。
- **一部の日本語文字列の文字化け**: 本格的なUI開発、権限文言の確認、本番ビルド前には修正が必要です。

## 現在の開発コミュニケーション

プロジェクトオーナーは、開発指示に音声入力を使うことが多いです。AI エージェントは、文脈から明らかな認識違いは補完し、実装や設計に影響する場合だけ質問してください。
