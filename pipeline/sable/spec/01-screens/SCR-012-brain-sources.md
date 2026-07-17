# SCR-012: Brain — ソース管理
- route: /app/[aiId]/brain/sources
- auth: authenticated
- purpose: AI社員の学習素材(URL・docs・商談録音テキスト・マーケ資料)の投入と管理

## Layout
```
+--sidebar--+---------------------------------------+
|           | Brain: [ソース] [ナレッジ]  ←タブ       |
|           | [+ ソースを追加 ▼]                     |
|           | | 種別 | 名前 | 状態 | 追加日 | 操作 |  |
|           | | URL  | 製品サイト | READY | … | 🗑 |  |
|           | | 録音 | 商談0701   | PROCESSING |…|  |
+-----------+---------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| SourceTable | ソース一覧。status=PROCESSING中はスピナー、FAILEDは[再処理]ボタン | Source |
| AddSourceMenu | 種別選択(DOCUMENT/CALL_RECORDING/MARKETING はテキスト貼付モーダル、PRODUCT_URLはURL入力)→ POST /api/sources → 自動でAIF-001の増分処理が走りKnowledgeNodeが増える | Source |
| DeleteButton | 確認ダイアログ→DELETE。由来KnowledgeNodeは残す(sourceId=null化)[ASSUMED] | - |

## States
- empty: 「ソースがありません。製品URLだけでも学習できます」
- error: 処理失敗ソースに「処理に失敗しました [再処理]」
- success: テーブル表示

## Interactions
- ソース追加 → 行がPENDING→PROCESSING→READYと遷移(ポーリング)→ 完了トースト「ナレッジがn件増えました」→ SCR-013で確認可能
- タブ[ナレッジ] → SCR-013

## AI Behaviors
- AIF-001(増分モード: 新ソースからKnowledgeNode抽出。isEdited=trueの既存ノードは上書きしない)
