# SCR-007: コンタクト一覧 / 詳細
- route: /app/contacts(一覧)、/app/contacts/[id](詳細)
- auth: authenticated
- purpose: 人物レコードの閲覧・手動作成

## Layout
一覧: テーブル。詳細: 左プロフィール+右関連ディール/活動。

```
一覧:
| 名前 | メール | 役職 | 企業 | 関連ディール数 |   [+ 追加]
詳細:
+ 名前/メール/役職/企業 | 関連ディール(DealRefCard) | 最近の活動
```

## Components
| Component | Behavior | Data |
|---|---|---|
| ContactTable | 名前クリック→詳細。検索ボックス(名前/メール部分一致、クエリパラメータ`q`) | Contact |
| AddContactButton | モーダル(名前*/メール*/役職/企業select or 新規名) → POST /api/contacts | Contact, Company |
| ContactProfile | フィールドのインライン編集(PATCH /api/contacts/:id) | Contact |
| RelatedDeals | DealContact経由。クリック→SCR-006 | Deal |

## States
- loading: テーブルスケルトン
- empty: 「コンタクトがいません」+[追加]ボタン
- error: 全面エラー+再読込。メール重複時はモーダル内に「このメールは登録済みです」
- success: 通常表示

## Interactions
- 追加モーダルで企業に新規名を入力 → Company自動作成(domainなし)して紐付け
- 検索 → デバウンス300msでGET /api/contacts?q=

## AI Behaviors
- none(エンリッチメントはMVP外 — 00-prd.md out_of_scope)
