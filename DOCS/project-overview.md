# プロジェクト概要

## 目的

LifeCube は、iOS / Android の両方で動作するインストール可能なモバイルアプリとして開発します。

家族で過ごす時間の中にある会話、表情、反応を、外側と内側の写真セットとして自然に残すことを目指します。

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
- `app/(tabs)/gallery.tsx`: 写真セットDBを使うアルバム一覧画面
- `app/(tabs)/home.tsx`: アプリ説明、合成パターン設定、課金設定入口を置くホーム画面
- `app/photo-set/[id].tsx`: アルバム詳細画面
- `app/modal.tsx`: モーダル画面

下部タブは `カメラ / アルバム / ホーム` の3つです。旧 `explore` 画面、旧 `camera.tsx` ルート、開発用の `voice-test` 画面は削除済みです。

現在コード上で確認できる機能領域は以下です。

- `expo-camera` によるカメラ撮影
- `expo-speech-recognition` による音声認識
- `@shopify/react-native-skia` によるローカル画像合成
- `expo-file-system` によるローカルファイル操作
- `expo-media-library` によるメディアライブラリ連携
- `expo-sqlite` による写真セット管理用のローカルDB

## 現在のビルド設定

`eas.json` には以下の build profile があります。

- `development`: development client、内部配布
- `preview`: テストユーザー確認。iOS では TestFlight 配布
- `production`: auto-increment 有効

環境名は Expo / EAS 標準に合わせて `development` / `preview` / `production` に統一します。TestFlight は `preview` 環境の iOS 配布手段として扱います。

`app.config.ts` には EAS project id が設定されています。`APP_VARIANT` によって環境別の bundle identifier / package name を切り替えます。

`expo-sqlite` を追加したため、既存の development build を端末に入れたままではSQLite連携を実機確認できない可能性があります。実機確認前に development build を作り直します。

## 現在見えているリスク

- ソースコードと設定ファイルの一部の日本語文字列が文字化けしています。本格的な UI 開発、権限文言の確認、本番ビルド前には修正が必要です。
- EAS Update、Android の preview 配布、production submit の承認フローはまだ設計されていません。
- 状態管理、データ保存、バックエンド、UIデザイン方針は意図的に未決定です。

## 現在の開発コミュニケーション

プロジェクトオーナーは、開発指示に音声入力を使うことが多いです。AI エージェントは、文脈から明らかな認識違いは補完し、実装や設計に影響する場合だけ質問してください。
