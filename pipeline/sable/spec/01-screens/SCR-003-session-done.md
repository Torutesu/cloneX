# SCR-003: セッション終了/フォローアップ(買い手向け)
- route: /d/[slug]/s/[sessionId]/done
- auth: public(sessionId所持)
- purpose: セッション要約と次のアクションを買い手に提示する

## Layout
```
+--------------------------------------------------+
|  [アバター(お辞儀/手振りアニメ)]                  |
|  「ご参加ありがとうございました!」                  |
|                                                  |
|  ■ 本日のまとめ(AIF-005の要約、現在言語で表示)     |
|  ・ご覧いただいた機能: …                           |
|  ・ご質問と回答: …                                |
|                                                  |
|  ■ 次のステップ                                   |
|  [製品サイトを見る]  [トランスクリプトを見る▼]      |
+--------------------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| SummaryCard | Session.summary(セッション終了時の言語で生成)をMarkdown表示 | Session.summary |
| ProductLink | AiEmployee.productUrlを新規タブで開く | AiEmployee |
| TranscriptAccordion | 折りたたみでトランスクリプト全文閲覧 | TranscriptTurn |

## States
- loading: 要約生成中(終了直後)は「まとめを作成しています…」+ thinkingアバター
- error: 要約生成失敗 → 要約なしで「ご参加ありがとうございました」+トランスクリプトのみ(AIF-005 fallback)
- success: 上記表示

## Interactions
- status=ACTIVEのセッションIDでアクセス → SCR-002へリダイレクト

## AI Behaviors
- AIF-005(要約は終了APIの中で生成済み。この画面は表示のみ)
