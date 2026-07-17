# SCR-003: ダッシュボード
- route: /app
- auth: authenticated
- purpose: 「今日AIが何を提案しているか」を最初に見せ、承認行動へ誘導する(見る場所ではなく承認する場所)

## Layout
左に共通サイドバー(全app画面共通)、右にコンテンツ2カラム。

```
+--sidebar--+------------------------------------------+
| Dashboard | 要承認 (N)               パイプライン概況  |
| Chat      | +--------------------+  +--------------+ |
| Pipeline  | | 提案カード(上位5件) |  | ステージ別    | |
| Contacts  | | [承認] [却下] [詳細]|  | 件数/金額     | |
| Companies | +--------------------+  +--------------+ |
| Tasks     | 今日のタスク(期日順5件)                   |
| Review(N) | 最近のアクティビティ(10件)                |
| Settings  |                                          |
+-----------+------------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| Sidebar(共通) | 各画面へのリンク。Review横にPENDING件数バッジ(GET /api/proposals?status=PENDING&count) | AiProposal |
| ProposalPreviewList | 上位5件。[承認][却下]はSCR-010と同じAPI。[すべて見る]→SCR-010 | AiProposal |
| PipelineSummary | ステージ別のディール件数と合計金額。クリック→SCR-005 | Deal, Stage |
| TodayTasks | 期日が今日以前のOPENタスク5件。チェックで完了 | Task |
| RecentActivity | Activity直近10件(全ディール横断) | Activity |

## States
- loading: 各カードにスケルトン
- empty: 提案0件なら「受信箱は空です。メールが届くとAIが提案を作ります」+[メールを取り込む]ボタン(SCR-015へ)
- error: カード単位でエラー表示+再読込
- success: 上記レイアウト

## Interactions
- 提案カードの[承認]/[却下] → 楽観的更新でカード除去、Review件数バッジ減算
- パイプライン概況のステージクリック → SCR-005(該当ステージへスクロール)
- タスクのチェック → PATCH /api/tasks/:id(status=DONE)

## AI Behaviors
- none(表示のみ。生成はAIF-001/003が別画面・別トリガーで実施)
