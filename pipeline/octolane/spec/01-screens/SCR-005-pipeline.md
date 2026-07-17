# SCR-005: パイプライン(カンバン)
- route: /app/pipeline
- auth: authenticated
- purpose: ディールをステージ列で俯瞰し、ドラッグ&ドロップでステージ移動する

## Layout
```
+--sidebar--+-----------------------------------------------+
|           | Lead(3/$12k) Qualified(1/$8k) Proposal ... Won |
|           | +---------+   +---------+                      |
|           | |DealCard |   |DealCard |  ← 横スクロール       |
|           | |DealCard |   +---------+                      |
|           | +---------+                                    |
|           | [+ ディール追加]列下部                           |
+-----------+-----------------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| StageColumn | ステージ名+件数+金額合計をヘッダに表示 | Stage, Deal |
| DealCard | 名前/企業名/金額/最終更新。10日以上更新なしは⚠バッジ(stuck)。クリック→SCR-006。draggable | Deal |
| DnD | カードを別列へドロップ → PATCH /api/deals/:id(stageId)。`data-testid="stage-column-<stageName>"` を付ける(E2E用) | Deal |
| AddDealButton | 列下部。モーダル(名前/企業/金額/コンタクト)→ POST /api/deals | Deal |

## States
- loading: 列ごとにスケルトンカード
- empty: 全件0なら中央に「ディールがありません。メールを取り込むかチャットで作成してください」+[Reviewへ]リンク
- error: 全面エラー+再読込。DnD失敗時はカードを元の列に戻しトースト表示
- success: 通常表示

## Interactions
- カードDnD → 楽観的更新→API失敗時ロールバック。移動時にActivity(type=SYSTEM,「Qualified → Proposalに移動」)を記録
- Wonへの移動 → カードに🎉演出(1秒)[ASSUMED: 品質演出]
- [+ ディール追加] → モーダル保存 → 列末尾に追加

## AI Behaviors
- none(stuck判定は単純ルール: updatedAt が10日以上前)
