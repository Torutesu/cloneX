# Clone Factory Spec Format v1

このフォーマットは clone-spec の出力であり clone-build の入力である。
**構造・ファイル名・IDの形式を変更してはならない。** 変更が必要な場合はこのファイル自体を更新し、版数を上げる。

## ディレクトリ構造

```
pipeline/<product-slug>/spec/
├── 00-prd.md            # プロダクト要求
├── 01-screens/          # 画面仕様(1画面1ファイル)
│   ├── SCR-001-<slug>.md
│   └── ...
├── 02-schema.md         # データスキーマ(Prisma形式 + ER図)
├── 03-api.md            # APIエンドポイント一覧
├── 04-e2e-cases.md      # E2Eテストケース(実装より先に確定)
└── 05-ai-features.md    # AIネイティブ機能の仕様
```

## 00-prd.md

```markdown
# PRD: <Product Name>
- version: 1
- source_teardown: ../teardown.md
- target_users: ...
- mvp_scope: [SCR-IDのリスト]
- out_of_scope: [明示的に作らないもの]
- success_criteria: [計測可能な条件]
```

## 01-screens/SCR-XXX-<slug>.md(1画面1ファイル)

```markdown
# SCR-001: <Screen Name>
- route: /path
- auth: public | authenticated | admin
- purpose: 1文

## Layout
(テキストでレイアウト構造を記述。ASCIIワイヤーフレーム可)

## Components
| Component | Behavior | Data |

## States
- loading / empty / error / success の各状態の表示

## Interactions
- ユーザー操作 → 結果(遷移先はSCR-IDで参照)

## AI Behaviors
- この画面でAIが自律的に行うこと(なければ none)
```

## 02-schema.md

- Prismaスキーマをそのまま記述(clone-buildがコピペで使える形)
- Mermaid ER図を併記
- 各モデルにコメントで「teardownのどのエンティティ由来か」を記す

## 03-api.md

```markdown
| Method | Path | Auth | Request | Response | Screen |
```
- Screen列はそのAPIを使うSCR-IDを列挙

## 04-e2e-cases.md(最重要 — 実装のゴールを定義する)

```markdown
## E2E-001: <case name>
- screens: [SCR-001, SCR-003]
- steps:
  1. Given ...
  2. When ...
  3. Then ...
- priority: P0 | P1 | P2
```

- P0はMVP完了の必須条件。clone-buildはP0が全通過するまで完了扱いにしない
- ケースは必ずユーザー視点(APIレベルではなくUI操作レベル)で書く

## 05-ai-features.md

teardownのセクション7から採用したAIネイティブ機能を仕様化:

```markdown
## AIF-001: <feature name>
- trigger: ユーザー操作 | スケジュール | イベント
- input_context: 何のデータを読むか
- model_tier: high (Fable/Opus級) | mid (Sonnet級) | light
- output: 何をするか
- fallback: AIが失敗した時のUX
- e2e_ref: [E2E-ID]  # AI機能にも必ずテストケースを紐付ける
```

## ID規則

- 画面: `SCR-001` 連番
- E2Eケース: `E2E-001` 連番
- AI機能: `AIF-001` 連番
- 相互参照は必ずIDで行う(名前参照は禁止。リネームで壊れるため)
