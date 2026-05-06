# アーキテクチャ

## 現在の構成

現状のアプリは Expo Router の file-based routing を使っています。

```text
app/
  _layout.tsx
  modal.tsx
  voice-test.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    gallery.tsx
    home.tsx
features/
  photo-sets/
    types.ts
    db.ts
    storage.ts
    save-photo-set.ts
components/
constants/
hooks/
utils/
assets/
```

## ルーティング方針

ルーティングは Expo Router を標準採用します。

理由:

- 現在のコードがすでに Expo Router 構成になっている。
- Expo / React Native / development build 前提の構成と相性がよい。
- 画面構造がファイル構成として見えるため、人間と AI エージェントの両方が読み取りやすい。
- typed routes、deep link、Web プレビューとの接続を扱いやすい。
- 必要な場合は Expo Router 上で React Navigation の API を利用できる。

運用ルール:

- `app/` 配下には route になる画面と layout を置きます。
- 共通 UI は `components/` に置きます。
- hooks は `hooks/`、汎用ロジックは `utils/` など、route ではないコードを `app/` に置かないようにします。

## 画面コードの分割方針

MVP初期では、画面単位の実装を優先し、必要以上に先回りした抽象化は避けます。

ただし、以下のようなロジックは `app/` の画面ファイルから切り出す候補です。

- 音声認識の開始、停止、イベント購読
- 「シャッター」と判定するトリガー語ロジック
- 外側カメラから内側カメラへの連続撮影フロー
- 写真保存、写真セット管理、削除
- 合成パターン選択や設定保存

切り出し先の候補:

```text
hooks/useShutterVoiceTrigger.ts
hooks/useCameraCaptureFlow.ts
utils/shutterTrigger.ts
components/camera/
constants/cameraTheme.ts
```

優先順位:

1. まずMVPの体験を実機で確認できる状態にする。
2. 同じ画面ファイルが読みづらくなった段階で、機能単位で切り出す。
3. 複数画面から使うことが確定したロジックは `hooks/` または `utils/` に移す。
4. 見た目だけの共通部品は `components/` に置く。

リファクタリングは、動いている体験を壊さない小さい単位で行います。

## プラットフォーム方針

- iOS と Android を主要ターゲットにします。
- Web プレビューは開発確認には便利ですが、プロダクトの基準はモバイルアプリです。
- ネイティブ機能は、まず Expo modules と安定した React Native ライブラリから利用します。
- ネイティブプロジェクトの直接変更は、アーキテクチャ上の明確な判断として扱います。

## 現在の機能フロー

カメラ領域では、現状以下のような流れが見えています。

```text
カメラを開く
  -> カメラと音声認識の権限を要求
  -> 写真を撮影
  -> カメラを切り替え
  -> 2枚目の写真を撮影
  -> Skia でローカル画像合成
  -> アプリ内保存領域に外側、内側、合成後の3枚を保存
  -> 合成後写真だけ端末の写真アプリへ保存
  -> SQLite に写真セット情報を保存
  -> アルバムに表示
```

## 状態管理

グローバル状態管理ライブラリはまだ選定していません。

決定するまでは、以下を基本にします。

- 画面内で完結する UI 状態はローカル state を使います。
- 1画面だけのためにグローバルストアを導入しません。
- 共有状態が必要になった場合は、ライブラリ選定の前に用途を文書化します。

## データ保存

MVP の写真セット永続化には `expo-sqlite` を使います。

現在の方針は以下です。

- 生成メディア用の FileSystem 保存
- 写真セット管理用の SQLite
- 合成後写真だけを端末の写真アプリにも保存
- トークンや秘密情報用の SecureStore
- 小さなアプリ設定用の MMKV または AsyncStorage
- 複数端末での同期が必要な場合のバックエンド同期

## バックエンドとデプロイ

バックエンド要件はまだ設計していません。

未整理の論点は以下です。

- 認証が必要か
- ユーザーデータを複数端末で同期するか
- 画像や生成メディアをクラウド保存するか
- カスタム API サーバーが必要か
- どのホスティング基盤を使うか

具体的な要件が固まるまでは、バックエンドに関する判断は `open-questions.md` に残します。
