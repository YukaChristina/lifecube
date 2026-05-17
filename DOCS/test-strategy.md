# テスト戦略

## 位置づけ

この文書は、MVP開発中の暫定的なテスト方針です。

現時点では、テスト戦略はまだ完成版ではありません。MVPを超えて製品化へ進む段階で、単体テスト、統合テスト、E2E、CI、実機検証の範囲を改めて精緻化します。

## 基本方針

- AI エージェントが実行しやすく、開発速度を落としすぎない確認を優先します。
- ただし、カメラ、音声認識、写真保存、SQLite、権限、アルバムのような中核機能は、静的チェックだけで完了扱いにしません。
- 自動化しにくい領域は、実機確認項目として明示します。
- 純粋ロジックに切り出せる部分から、段階的に単体テストを追加します。

## 最低確認

通常のコード変更では、最低限以下を実行します。

```bash
npm run lint
npx tsc --noEmit
```

ドキュメントのみの変更では、上記の実行は必須ではありません。ただし、コードや設定に影響する変更を含む場合は実行します。

## 環境設定変更時の確認

`app.config.ts`、`app.json`、`eas.json`、`.env`、bundle identifier、package name、scheme、EAS channel を変更した場合は、通常の lint / typecheck に加えて以下を確認します。

```bash
npm run lint
npx tsc --noEmit
npx expo config
```

確認すること:

- development の bundle identifier / package name が `.dev` になっていること。
- development の icon が `assets/images/icon-dev.png` になっていること。
- preview / production が本番用 bundle identifier / package name を使っていること。
- preview / production の icon が `assets/images/icon.png` になっていること。
- `extra.eas.projectId` が既存 projectId のままであること。
- `.env.local` が Git 管理対象になっていないこと。
- `EXPO_PUBLIC_*` に秘密情報が含まれていないこと。

bundle identifier、native plugin、権限、icon、EAS profile を変更した場合は、development build の作り直しが必要になる可能性があります。

TestFlight submit 前に確認すること:

- `eas build --platform ios --profile preview` で作った build であること。
- Expo config の `ios.bundleIdentifier` が `com.yukachristina.lifecube` であること。
- App Store Connect の submit 先が `com.yukachristina.lifecube` のアプリであること。
- `lifecube-dev` / `com.yukachristina.lifecube.dev` に submit していないこと。

Android preview 配布前に確認すること:

- `eas build --platform android --profile preview` で作った APK であること。
- `eas.json` の preview profile に `android.buildType: apk` があること。
- Expo config の `android.package` が `com.yukachristina.lifecube` であること。
- Firebase App Distribution の upload 先が `com.yukachristina.lifecube` の Android app であること。
- Firebase service account key などの秘密情報を Git 管理していないこと。

## 変更範囲別の確認

カメラ、音声認識、権限、写真保存、SQLite、メディアライブラリに関わる変更では、Android / iOS の実機確認が必要になる可能性があります。

実機確認が必要な例:

- 起動直後にカメラ画面が開くか。
- 「シャッター」音声で撮影できるか。
- 外側カメラから内側カメラへ切り替わるか。
- 背面カメラのみモードで、前面カメラへ切り替わらず1枚写真として保存されるか。
- 撮影後プレビューが表示されるか。
- 撮影後プレビューの4秒進捗バーが高さ8pxで左から右へ進み、4秒経過でカメラへ戻るか。
- アプリ内保存領域に写真セットが保存されるか。
- 前後カメラ撮影では合成後写真が端末の写真アプリに保存されるか。
- 背面カメラのみ撮影では背面写真が LifeCube アルバムと端末の写真アプリに保存されるか。
- SQLite に写真セット情報が保存されるか。
- 縦向きでは9:16、横向きでは16:9の成果物画像が生成、表示、保存されるか。
- 横向き写真のアルバムサムネイルが横長比率のまま表示されるか。
- カメラ画面で待機しても画面スリープしないか。スリープ抑止は実機確認済みですが、関連実装を変更した場合は再確認します。
- LifeCube 前面利用中に他アプリ音楽を併用できるか。
- バックグラウンド音声検知を検証する場合、OS制約、常駐通知、バッテリー影響が許容範囲か。
- 権限拒否時の案内が破綻しないか。

UI変更では、対象画面の手動確認を行い、確認できなかった端末や画面サイズがあれば報告します。ガイドタブを追加または変更した場合は、`カメラ / アルバム / ガイド / ホーム` の順でタブ移動できることも確認します。

## 単体テスト候補

以下は、ロジックが安定した段階で単体テストを追加しやすい領域です。

- 写真セットの日付グルーピング
- `createdAt` による並び替え
- `deletedAt` がある写真セットの除外
- DB row から `PhotoSet` への変換
- 合成パターン選択ロジック
- 撮影モードに応じた保存対象の判定ロジック
- 縦横の出力サイズ判定ロジック
- 音声トリガー語の判定ロジック

MVP中は、テストのために大きな設計変更を先行しません。自然に純粋関数へ切り出せるところから追加します。

## 報告ルール

作業後は以下を報告します。

- 実行したコマンド
- 手動確認した内容
- 実行できなかった確認と理由
- 実機確認が必要な残タスク
- テスト戦略上の不足や今後追加すべきテスト
