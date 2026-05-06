# プロジェクト概要

## 目的

LifeCube は、iOS / Android の両方で動作するインストール可能なモバイルアプリとして開発します。

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
- `app/(tabs)/index.tsx`: スターター由来のホーム画面
- `app/(tabs)/camera.tsx`: カメラ機能の画面
- `app/(tabs)/gallery.tsx`: ローカルギャラリー画面
- `app/modal.tsx`: モーダル画面
- `app/voice-test.tsx`: 音声認識テスト画面

現在コード上で確認できる機能領域は以下です。

- `expo-camera` によるカメラ撮影
- `expo-speech-recognition` による音声認識
- `@shopify/react-native-skia` によるローカル画像合成
- `expo-file-system` によるローカルファイル操作
- `expo-media-library` によるメディアライブラリ連携

## 現在のビルド設定

`eas.json` には以下の build profile があります。

- `development`: development client、内部配布
- `preview`: 内部配布
- `production`: auto-increment 有効

`app.json` には EAS project id が設定されています。

## 現在見えているリスク

- ソースコードと設定ファイルの一部の日本語文字列が文字化けしています。本格的な UI 開発、権限文言の確認、本番ビルド前には修正が必要です。
- ローカルの Expo 開発環境から、実際の配布・デプロイまでの流れはまだ設計されていません。
- 状態管理、データ保存、バックエンド、UIデザイン方針は意図的に未決定です。

## 現在の開発コミュニケーション

プロジェクトオーナーは、開発指示に音声入力を使うことが多いです。AI エージェントは、文脈から明らかな認識違いは補完し、実装や設計に影響する場合だけ質問してください。
