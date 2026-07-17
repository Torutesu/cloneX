# SCR-013: タスク
- route: /app/tasks
- auth: authenticated
- purpose: 自分+AI生成のネクストアクションを期日順に管理する

## Layout
```
| フィルタ: [未完了|完了|すべて]                [+ タスク追加] |
| ☐ 見積を送付する  🤖AI  Acme社との商談  期日 7/18(赤=超過) |
| ☐ デモ日程を確定  👤    Beta社PoC      期日 7/20           |
```

## Components
| Component | Behavior | Data |
|---|---|---|
| TaskList | 期日昇順(期日なしは末尾)。超過は期日を赤字。ディール名クリック→SCR-006 | Task, Deal |
| TaskCheckbox | チェック→PATCH /api/tasks/:id(status=DONE)。楽観的更新 | Task |
| SourceBadge | source=AIは🤖、USERは👤 | Task |
| AddTaskButton | モーダル(タイトル*/期日/ディールselect)→ POST /api/tasks | Task |
| FilterTabs | statusフィルタ(クエリパラメータ`status`) | - |

## States
- loading: 行スケルトン
- empty: 「タスクはありません」
- error: 更新失敗でロールバック+トースト
- success: 完了時に打ち消し線→0.5秒後にリストから消える(未完了フィルタ時)

## Interactions
- チェック → DONE化+ディールに紐づく場合Activity(TASK「完了: <タイトル>」)記録
- 追加 → リストに反映

## AI Behaviors
- none(AIタスクの生成はAIF-001/承認ループ経由)
