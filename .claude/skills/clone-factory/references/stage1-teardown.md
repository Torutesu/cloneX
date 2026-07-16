
# Clone Teardown — Stage 1 of Clone Factory

ベンチマークプロダクトを分解し、`teardown.md` を生成する。
このレポートは **clone-spec の入力** になる。フォーマット逸脱は下流全体を壊すので厳守。

## 入力

- **必須**: 対象プロダクトのURL(複数可)
- **任意**: ユーザーの追加プロンプト(スコープ指定・除外指定・AIネイティブ化の方向性など)
- **任意**: スクショ、画面録画、料金ページ、ドキュメントURL

## 実行手順

### 1. 情報収集(手を抜かない)

- WebFetch/検索で対象のLP、料金ページ、docs、changelog、比較記事、レビュー(G2/Product Hunt/HN)を収集
- 公開デモ・動画・スクショがあれば画面構成を読み取る
- ユーザーがスクショを提供している場合はそれを一次情報として最優先
- **わからないことは推定と明記する**。確認できた事実と推定を混ぜない

### 2. 分解の観点

以下を必ず埋める。埋まらない項目は `[要確認]` を付けて残す(削除しない):

1. **ポジショニング**: 誰の何の課題を解くか。1文で
2. **機能マップ**: 機能を階層リスト化。コア機能に ★ を付ける
3. **画面インベントリ**: 画面ごとに `SCR-001` 形式のIDを振る。名前 / 目的 / 主要UI要素 / 遷移先
4. **ユーザーフロー**: 主要フロー3〜5本を `SCR-ID` の連鎖で記述
5. **データモデル推定**: エンティティと関係を推定(Mermaid ER図)
6. **課金構造**: プラン、価格、無料枠、課金トリガー
7. **AIネイティブ化ポイント**: このプロダクトの各機能を「AIが主語」に置き換えるとどうなるか。SHOGUN的観点(コンテキストレイヤー接続、自律実行、passive capture)で最低5個
8. **コピーする / 捨てる / 変える**: 3分類の判断リスト。理由付き
9. **スコープ提案**: MVP(2週間)で作る範囲の提案

### 3. ユーザーの追加プロンプトの反映

追加プロンプトがある場合(例:「CRM部分だけ」「日本の商習慣に合わせる」)は、
セクション8・9の判断に必ず反映し、反映箇所に `[USER-REQ]` タグを付ける。

## 出力フォーマット(厳守)

`./pipeline/<product-slug>/teardown.md` に保存する:

```markdown
# Teardown: <Product Name>
- source_urls: [...]
- date: YYYY-MM-DD
- user_requirements: <追加プロンプトの要約 or none>
- confidence: high | medium | low  # 情報の裏取り度合い

## 1. Positioning
## 2. Feature Map
## 3. Screen Inventory
| ID | Screen | Purpose | Key UI | Nav to |
## 4. User Flows
## 5. Data Model (estimated)
## 6. Pricing
## 7. AI-Native Opportunities
## 8. Copy / Drop / Change
## 9. MVP Scope Proposal
## Appendix: Open Questions [要確認]
```

## 品質基準(DoD)

- 画面インベントリが10画面未満のSaaSはほぼ存在しない。少なすぎたら調査不足を疑う
- セクション7(AI-Native)が汎用論(「AIで自動化」等)になっていたら書き直す。具体的な機能単位で書く
- Open Questionsが0件はありえない。正直に残す

## 完了時

teardown.mdのパスと、Open Questionsのうちユーザー判断が必要なものだけを箇条書きで提示。
「このままclone-specに進めるか、Open Questionsを先に潰すか」を確認する。
