---
name: clone-factory
description: >
  ベンチマークプロダクトのURLから、分解(teardown)→仕様化(spec)→自律実装(build)まで
  一気通貫で行うクローンファクトリーパイプライン。
  ユーザーがプロダクトURLを貼って「クローンして」「これ作りたい」「分解して」「teardownして」
  「ベンチマークして」「specにして」「buildして」「実装して」と言ったとき、
  または競合プロダクトの分析・複製・AIネイティブ化を求めてきたときは必ずこのスキルを使うこと。
  途中ステージからの再開(spec/が既にある状態でbuild等)にも対応する。
---

# Clone Factory — Teardown → Spec → Build

ベンチマークURL + 追加プロンプトを入力に、E2Eテスト全通過のプロダクトまで自律的に到達するパイプライン。

## 最初にやること: ステージ判定

`pipeline/<product-slug>/` の状態を見て、どこから始めるか決める:

| 状態 | 開始ステージ |
|---|---|
| 何もない(URLだけ渡された) | Stage 1 から |
| `teardown.md` あり | Stage 2 から |
| `spec/` あり | Stage 3 から |
| ユーザーが明示指定(「teardownだけ」等) | 指定に従う |

**フル実行(「クローンして」)の場合も、ステージ境界で必ず一度停止してユーザー確認を取る。**
確認内容は各ステージの「完了時」に定義。「全部ノンストップで」と明示された場合のみ確認を省略できるが、
その場合も判断ログを `pipeline/<slug>/decisions.md` に残す。

## 共通ルール

- 成果物は全て `pipeline/<product-slug>/` 配下。フォーマットは `references/spec-format.md` に従う
- ID(SCR/E2E/AIF)はステージをまたいで引き継ぐ。相互参照は必ずIDで行う
- 事実と推定を混ぜない。推定には `[要確認]` または `[ASSUMED: 理由]` を付ける
- ユーザーの追加プロンプトの反映箇所には `[USER-REQ]` タグを付ける

## 各ステージの手順書(該当ステージ開始時に必ず読む)

1. **Stage 1 — Teardown**: `references/stage1-teardown.md` を読む
   - 入力: URL + 追加プロンプト / 出力: `teardown.md`
2. **Stage 2 — Spec**: `references/stage2-spec.md` と `references/spec-format.md` を読む
   - 入力: `teardown.md` / 出力: `spec/` ディレクトリ
3. **Stage 3 — Build**: `references/stage3-build.md` を読む
   - 入力: `spec/` + `brands/<brand>.config` / 出力: 動くプロダクト(E2E P0全通過)

## モデル運用の注意

Stage 1-2 は判断の質が下流全体を決めるため高知能モデルでの実行を推奨、
Stage 3 は長時間実行になるためコスト効率の良いモデルでよい。
現在のセッションのモデルが不適な場合はユーザーにその旨を伝える(勝手に品質を落とさない)。
