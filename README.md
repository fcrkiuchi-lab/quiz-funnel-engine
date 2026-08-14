# ドーシャ割合チェック

ヴァータ、ピッタ、カパの3つの点数から、それぞれの構成割合を表示する依存関係なしの最小Webプロトタイプです。承認済みの範囲は `SPEC.md` に記載しています。

## 使い方

`index.html` をブラウザで開いてください。外部通信やビルドは不要です。

3項目に0以上の整数を入力し、「割合を確認する」を押すと、入力した点数と小数第1位に丸めた割合が表示されます。

## テスト

Node.jsがすでにインストールされている場合、追加パッケージなしで次を実行できます。

```text
node tests/calculator.test.js
node tests/diagnosis-template.test.js
```

## 再利用用の診断テンプレート

公開中の割合計算機とは分離して、`diagnosis-template/` に設定データ差し替え型の診断サンプルを置いています。設問、選択肢、加点先は `diagnosis-template/config.js` だけで変更できます。固定仕様と範囲外は `TEMPLATE-SPEC.md` を参照してください。

n8n連携は既定で無効です。`config.js` の連携設定を明示的に有効化し、HTTPSのWebhook URLを設定した場合だけ結果を送信します。公開中の割合計算機には連携されていません。

## 再利用リリース手順

テスト、構文検査、commit、push、GitHub Pages反映確認をまとめて実行する場合は次を使います。`-Publish` を付けた実行は一般公開を更新するため、公開承認後だけ行ってください。

```powershell
.\scripts\release.ps1 -CommitMessage "変更内容" -Publish
```

`-Publish` を省略すると、検証とcommitまでで停止します。公開確認では毎回固有の `release-marker.json` を作り、公開先の内容とローカル内容のSHA-256が一致するまで待機します。
