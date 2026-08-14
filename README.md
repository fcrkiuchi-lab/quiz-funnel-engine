# quiz-funnel-engine

顧客別設定を差し替えるだけで、開始・質問・自動採点・結果まで動くスマートフォン対応の診断Webアプリ基盤です。ドーシャ傾向セルフチェックを既定の完成例として収録しています。

## ローカル実行

外部依存とビルドはありません。ルートの`index.html`を開くか、ローカルHTTPサーバーから表示します。

```powershell
python -m http.server 8000
```

`http://127.0.0.1:8000/`でドーシャ設定の開始画面が開きます。

## 顧客別設定

質問、選択肢、配点、診断軸、名称、文章、配色は`diagnosis-template/config.js`に集約されています。新しい診断ではこのファイルだけを編集し、本体コードは変更しません。詳しい契約は`TEMPLATE-SPEC.md`を参照してください。

第2サンプルへ差し替える例：

```powershell
Copy-Item diagnosis-template/configs/work-style.js diagnosis-template/config.js -Force
```

この操作後のGit差分は`diagnosis-template/config.js`だけになります。確認後はGitに保存されたドーシャ設定へ戻してください。

## テスト

```text
node tests/calculator.test.js
node tests/diagnosis-template.test.js
```

旧割合計算機のコードと7テストは回帰資産として残しています。診断本体は外部通信や保存を行いません。

## リリース

テスト、JavaScript構文検査、差分検査、commitまでは次で実行できます。

```powershell
.\scripts\release.ps1 -CommitMessage "変更内容"
```

`-Publish`はpushとGitHub Pages更新を行うため、明示承認がある場合だけ使用してください。公開確認用の`release-marker.json`はスクリプトが生成します。
