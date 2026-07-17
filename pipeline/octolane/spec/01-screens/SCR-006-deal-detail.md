# SCR-006: ディール詳細
- route: /app/deals/[id]
- auth: authenticated
- purpose: 1ディールの全コンテキスト(フィールド・関係者・タイムライン・タスク)を1画面に集約する

## Layout
```
+--sidebar--+---------------------------+---------------+
|           | ディール名  [ステージ▼]     | 関係者         |
|           | 金額 [編集可] 次アクション   |  ContactChip× |
|           |---------------------------|  企業リンク     |
|           | タブ: タイムライン | タスク | ノート          |
|           | ● EMAIL 件名... 7/10      |               |
|           | ● SYSTEM ステージ移動 7/12 |               |
|           | ● TASK 見積送付 7/14      |               |
|           | [ノート追加入力欄]          |               |
+-----------+---------------------------+---------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| DealHeader | 名前インライン編集、ステージselect(変更→PATCH /api/deals/:id)、金額インライン編集 | Deal |
| ContactList | DealContactのチップ表示(名前+role)。クリック→SCR-007の該当コンタクト | Contact |
| CompanyLink | クリック→SCR-008該当企業 | Company |
| Timeline | Activity降順。type別アイコン(✉/📝/✅/⚙/🤖)。EMAILはクリックで本文展開(EmailMessage) | Activity |
| TaskTab | このディールのタスク一覧+追加フォーム | Task |
| NoteTab / NoteInput | ノート一覧+追加(POST /api/notes)→タイムラインにも反映 | Note |

## States
- loading: ヘッダ+タイムラインをスケルトン
- empty: タイムライン0件「まだ活動がありません」
- error: 404なら「ディールが見つかりません」+SCR-005へ戻るリンク
- success: 通常表示

## Interactions
- ステージ変更 → Activity(SYSTEM)記録 → タイムライン先頭に追加
- 金額編集 → PATCH → タイムラインにSYSTEM記録
- ノート追加 → Note作成+Activity(NOTE)記録
- タスク追加/完了 → Task作成/更新+Activity(TASK)記録

## AI Behaviors
- このディールに紐づくPENDING提案があれば、ヘッダ下に黄色帯「AIの提案がN件あります → [Review]」を表示(SCR-010へ)
