
# Clone Build — Stage 3 of Clone Factory

spec/ を読み、E2E P0全通過まで自律実装する。

## 入力

- `pipeline/<product-slug>/spec/`(必須)
- `brands/<brand>.config.ts`(任意。なければデフォルトブランドで実装し、後からSkin可能な構造にする)

## 前提

- スターターレポ(Next.js + Prisma + auth + Playwright + design tokens構成)上で作業する
- スターターレポのCLAUDE.mdの規約が本スキルと矛盾する場合、**CLAUDE.mdを優先**する

## 実行手順

### Phase 0: 準備

1. spec/ 全ファイルを読む。`00-prd.md` の mvp_scope を実装対象として確定
2. `04-e2e-cases.md` のP0ケースをPlaywrightテストとして**先に全て実装**する(この時点では全部fail=正常)
3. TodoListに「schema → API → 画面(SCR-ID順) → AI機能(AIF-ID順) → E2E green化」を登録

### Phase 1: 土台

1. `02-schema.md` のPrismaスキーマを適用、migrate
2. `03-api.md` のエンドポイントを実装(この段階ではAI機能はスタブでよい)

### Phase 2: 画面

- SCR-ID順に実装。1画面完了ごとに:
  - loading / empty / error / success の4状態を確認
  - デザインは design tokens(brand.config)経由でのみ色・フォントを参照。ハードコード禁止
  - その画面に関係するE2Eケースを実行

### Phase 3: AI機能

- `05-ai-features.md` のAIF順に実装
- model_tier に従いモデルを選択(API呼び出しは環境変数でモデルID指定できる構造にする)
- fallback UXを必ず実装(AIレスポンス失敗でアプリが壊れないこと)

### Phase 4: 自己修正ループ

```
while (P0のE2Eに失敗がある):
    失敗ケースを1つ選ぶ → 原因を特定 → 修正 → 該当ケース再実行
    同一ケースで3回連続失敗したら:
        スペック側の矛盾を疑い、矛盾があればレポートに記録して人間にエスカレーション
ループ上限: 合計20イテレーション。超えたら現状報告して停止
```

## 禁止事項

- E2Eテストを弱める・スキップする・削除することで「通過」させること(絶対禁止)
- スペックにない機能の追加(気づいた改善案は `pipeline/<slug>/build-notes.md` に書くだけ)
- スペックからの逸脱を黙って行うこと(逸脱が必要なら build-notes.md に理由を記録)

## 完了条件(DoD)

- [ ] P0 E2E全通過
- [ ] `npm run build` 成功、型エラー0
- [ ] Lighthouse: Performance/A11y/SEO 各90+(LP系画面)
- [ ] brand.config差し替えでブランド変更が全画面に反映されることを1回確認

## 完了時の報告

- P0/P1通過状況、実装した画面・AIF一覧
- build-notes.md の要約(逸脱・改善案・スペックへのフィードバック)
- 次ステージ(Skin/Ship)への引き継ぎ事項
