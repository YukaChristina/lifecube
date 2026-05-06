# ネイティブアプリ方針

## 対象

LifeCube は、iOS / Android の両方にインストールして動作するアプリとして開発します。

開発基盤は Expo です。development、preview、production のビルドには EAS Build を使う方針です。

## Expo優先

カスタムネイティブコードよりも、まず Expo modules と実績のある React Native ライブラリを使います。

現在関係しているネイティブ機能領域は以下です。

- カメラ
- マイク
- 音声認識
- メディアライブラリ
- ファイルシステム
- SQLite
- 画像合成

## Development Build 前提

このプロジェクトは development build 前提で開発します。

標準の開発サーバー起動:

```bash
npx expo start --dev-client
```

現在の `eas.json` には以下の build profile があります。

- `development`
- `preview`
- `production`

各 profile の運用方針:

```text
development
  開発者の端末に入れて、ローカル開発サーバーに接続するためのビルド

preview
  開発サーバーなしで内部確認するための配布ビルド

production
  App Store / Google Play への提出を想定した本番ビルド
```

## Development Build を作り直すタイミング

以下の変更では、development build の作り直しが必要になる可能性があります。

- ネイティブ依存関係を追加または更新した
- `app.json` の plugin、権限、scheme、bundle identifier、package name などを変更した
- `eas.json` の build profile を変更した
- Expo SDK や native module を更新した
- iOS / Android のネイティブ設定に影響する変更をした

通常の JS / TS / UI の変更だけであれば、毎回 EAS Build を実行する必要はありません。

`expo-sqlite` のような Expo native module を新しく追加した場合、すでに端末へインストール済みの development build にはそのネイティブコードが含まれていません。そのため、Android / iOS 実機で確認するには development build の作り直しが必要です。

一方で、すでに development build に含まれているネイティブモジュールを使った JS / TS 側の実装変更だけであれば、通常は開発サーバーの再読み込みで確認できます。

## 実機確認の前提

カメラ、マイク、音声認識、写真ライブラリ保存は、iOS と Android の両方で実機確認します。

シミュレーターやWebプレビューだけで判断しない領域:

- 「シャッター」音声検知の継続動作
- 外側カメラから内側カメラへの切り替え時間
- 切り替え直後の写真品質
- 写真アプリ保存後の再取得
- 権限ダイアログの表示タイミング

UIだけの確認はシミュレーターでも進められますが、MVP の中核ワークフローは実機確認を完了条件にします。

## ネイティブ対応が必要になるケース

ネイティブコードや設定変更が必要になる可能性があるのは、以下のような場合です。

- Expo modules だけでは必要なプラットフォーム挙動を実現できない。
- App Store または Google Play の要件により、プラットフォーム固有の設定が必要になる。
- 利用ライブラリが config plugin、ネイティブ権限、build profile の変更を要求する。
- JS / TS や既存のネイティブ連携ライブラリでは、必要な性能を満たせない。

## 未整理のデプロイ論点

配布・デプロイの全体像はまだ未完成です。今後決める必要があるものは以下です。

- 内部配布の流れ
- App Store Connect の設定
- Google Play Console の設定
- 環境変数と secrets の管理
- バックエンドホスティングが必要な場合の基盤
- リリースバージョン管理と submit の流れ

Web プレビューで動くことを、モバイルアプリとしてリリース可能であることと同一視しません。
