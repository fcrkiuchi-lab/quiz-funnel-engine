# quiz-funnel-engine 運用ルール

- 検証中の途中報告と手動撮影は禁止する。画面証跡が必要な場合は、Playwright による自動キャプチャだけを使う。
- ブラウザ拡張接続と Computer use は使わない。視覚検証はローカル Microsoft Edge の Playwright 実行で行う。
- State Log は直接確認できた事実だけを報告する。未確認の追記・更新・存在を報告しない。
- 公開だけは、対象と内容を明示したユーザー承認を1回受けてから実行する。それ以外の作業で公開しない。

## Release contract

- A change outside the declared release contract is a `PROPOSED_EXCEPTION`: stop and report it; never restore it automatically.
- Only `scripts/release.ps1` may publish this project.
