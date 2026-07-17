# SCR-013: Brain — ナレッジビュー
- route: /app/[aiId]/brain/knowledge
- auth: authenticated
- purpose: コンテキストグラフ(ナレッジ)の閲覧・編集と、知識ギャップの解消(F3改善ループの中心)

## Layout
```
+--sidebar--+---------------------------------------+
|           | Brain: [ソース] [ナレッジ]              |
|           | ⚠ 未解決の知識ギャップ 2件 ──────────┐  |
|           | | 「SSOは対応していますか?」[回答を作成]│  |
|           | └────────────────────────────────┘  |
|           | フィルタ: [全種別▼] [検索        ]      |
|           | | 種別 | タイトル | 由来 | 更新 | 操作 | |
|           | | FAQ | 料金体系 | 製品サイト | … |✏️🗑| |
+-----------+---------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| GapBanner | OPENなKnowledgeGapを上部に警告表示。[回答を作成]→ 質問文がプリセットされたノード作成モーダル(kind=FAQ)。保存でgap.status=RESOLVED、resolvedNodeId設定 | KnowledgeGap |
| KnowledgeTable | ノード一覧。kindバッジ、由来ソース名、isEditedは「手動修正済み」バッジ | KnowledgeNode |
| NodeEditModal | title/body/kindを編集。保存でisEdited=true | KnowledgeNode |
| AddNodeButton | 手動ノード追加 | KnowledgeNode |

## States
- empty: 「ナレッジがありません。ソースを追加するか(SCR-012)、手動で作成してください」
- error: 保存失敗トースト
- success: テーブル表示

## Interactions
- ギャップ[回答を作成] → モーダル保存 → バナーから消え、ノードが追加される → 以後SCR-002で同じ質問に回答できる(E2Eで検証)
- 行✏️ → 編集モーダル。🗑 → 確認→削除

## AI Behaviors
- [回答を作成]モーダルでbody下書きをAIが提案(既存ノード+ソースから推定。AIF-006の一部)。fallback: 空欄で人間が記入
