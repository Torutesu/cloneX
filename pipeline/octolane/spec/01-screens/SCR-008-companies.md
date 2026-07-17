# SCR-008: 企業一覧 / 詳細
- route: /app/companies(一覧)、/app/companies/[id](詳細)
- auth: authenticated
- purpose: 企業レコードの閲覧・手動作成

## Layout
一覧: テーブル(名前/ドメイン/コンタクト数/ディール数)。詳細: 企業情報+所属コンタクト+関連ディール。

## Components
| Component | Behavior | Data |
|---|---|---|
| CompanyTable | 名前クリック→詳細。[+ 追加]モーダル(名前*/ドメイン) | Company |
| CompanyProfile | 名前/ドメインのインライン編集(PATCH /api/companies/:id) | Company |
| MemberContacts | 所属コンタクト一覧 → SCR-007詳細へ | Contact |
| RelatedDeals | 関連ディール一覧 → SCR-006へ | Deal |

## States
- loading: テーブルスケルトン
- empty: 「企業がありません」+[追加]
- error: ドメイン重複時「このドメインは登録済みです」
- success: 通常表示

## Interactions
- 追加 → POST /api/companies → 一覧に反映

## AI Behaviors
- none
