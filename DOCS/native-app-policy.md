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

## 環境運用方針

環境名は Expo / EAS 標準に合わせて以下の3つに統一します。

```text
development
  開発者の端末に入れる development build。
  ローカル開発サーバーに接続して確認する。

preview
  テストユーザー確認用の配布環境。
  iOS では TestFlight 配布として扱う。

production
  App Store / Google Play の本番配布環境。
```

TestFlight は環境名ではなく、`preview` 環境の iOS 配布手段として扱います。

同一端末に development build と preview / production のアプリを共存させるため、development では本番系とは異なる bundle identifier / package name を使います。

```text
development
  ios.bundleIdentifier: com.yukachristina.lifecube.dev
  android.package: com.yukachristina.lifecube.dev
  scheme: lifecube-dev
  icon: assets/images/icon-dev.png

preview
  ios.bundleIdentifier: com.yukachristina.lifecube
  android.package: com.yukachristina.lifecube
  scheme: lifecube
  icon: assets/images/icon.png

production
  ios.bundleIdentifier: com.yukachristina.lifecube
  android.package: com.yukachristina.lifecube
  scheme: lifecube
  icon: assets/images/icon.png
```

preview と production は同じ本番用 bundle identifier を使います。これは、iOS の TestFlight が App Store Connect 上の同一アプリに紐づくためです。preview と production を同一端末で別アプリとして共存させる設計は、現時点では採用しません。

development は preview / production と取り違えないように、アプリ名とアイコンを分けます。development 用アイコンは `assets/images/icon-dev.png` を使います。app icon は 1024 x 1024 の PNG を基準に用意します。

環境切替は `APP_VARIANT` を基準にし、`app.config.ts` で Expo config を動的に生成します。`app.json` に環境別の固定値を増やさない方針とします。

```text
APP_VARIANT=development
APP_VARIANT=preview
APP_VARIANT=production
```

`extra.eas.projectId` は既存の Expo project を指す値として維持します。個人アカウント側の別 projectId に変更しません。

EAS profile、EAS Environment、EAS Update channel を扱う場合は、原則として同じ名前に揃えます。

```text
development
  environment: development
  channel: development
  APP_VARIANT=development

preview
  environment: preview
  channel: preview
  APP_VARIANT=preview

production
  environment: production
  channel: production
  APP_VARIANT=production
```

ローカル開発では `.env.local` を使います。`.env.local` は Git 管理しません。

```env
APP_VARIANT=development
EXPO_PUBLIC_APP_ENV=development
```

EAS CLI / Node の基準は当面以下とします。

```text
eas-cli/18.11.0 win32-x64 node-v22.15.0
```

`eas build --platform all --auto-submit` は、ストア提出まで進む可能性があるため、通常の開発確認では実行しません。

## Build / Submit の運用

TestFlight 用の preview 環境は、ローカルの `.env.local` を書き換えて選ぶのではなく、EAS Build profile で選びます。

```bash
eas build --platform ios --profile preview
```

この profile により `APP_VARIANT=preview` が渡され、`app.config.ts` が本番系 bundle identifier の `com.yukachristina.lifecube` を生成します。

development build はローカル開発用であり、App Store Connect / TestFlight には submit しません。

```text
development
  build: eas build --platform ios --profile development
  submit: しない

preview
  build: eas build --platform ios --profile preview
  submit: eas submit --platform ios --profile preview

production
  build: eas build --platform ios --profile production
  submit: eas submit --platform ios --profile production
```

Android でも同じ profile 名を使います。Android の preview submit は Google Play 側の内部テスト運用が整ってから行います。

`eas submit --profile preview` を使う場合は、submit 先が Bundle ID `com.yukachristina.lifecube` の App Store Connect アプリであることを確認します。`lifecube-dev` / `com.yukachristina.lifecube.dev` へ submit しません。

## Development Build を作り直すタイミング

以下の変更では、development build の作り直しが必要になる可能性があります。

- ネイティブ依存関係を追加または更新した
- `app.json` / `app.config.ts` の plugin、権限、scheme、bundle identifier、package name などを変更した
- `app.config.ts` の icon / adaptiveIcon を変更した
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

配布・デプロイの全体像はまだ未完成です。環境名は `development` / `preview` / `production` に統一しますが、今後決める必要があるものは以下です。

- App Store Connect の設定
- Google Play Console の設定
- EAS Update を導入するタイミング
- Android の preview 配布の流れ
- production submit の承認フロー
- バックエンドホスティングが必要な場合の基盤
- リリースバージョン管理の流れ

Web プレビューで動くことを、モバイルアプリとしてリリース可能であることと同一視しません。
