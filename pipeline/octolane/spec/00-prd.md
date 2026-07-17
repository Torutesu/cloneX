# PRD: cloneX — Self-driving AI CRM (Octolane clone)

- version: 1
- source_teardown: ../teardown.md
- target_users: founder-led salesの創業者、1〜5人のGTMチーム。CRMへの手入力をゼロにしたい層
- mvp_scope: [SCR-001, SCR-002, SCR-003, SCR-004, SCR-005, SCR-006, SCR-007, SCR-008, SCR-010, SCR-013, SCR-015]
- out_of_scope:
  - SCR-009 ミーティングレコーダー(Zoom/Meet/Teamsボット参加)— 文字起こし取込も次版
  - SCR-011 Visitor Signal(IPリバースルックアップ)
  - SCR-012 メールシーケンス
  - SCR-014 インボックス(メール閲覧はSCR-006タイムライン内展開で代替)
  - SCR-016 メンバー招待(ワークスペースは作成者1人)、SCR-018 課金
  - 既存CRM移行(HubSpot/Salesforce/Pipedrive)、実メール送信(Gmail API)、エンリッチメント、Zapier、SSO/SAML
  - 自動承認しきい値の学習化(AIF-004は静的ルール版)
- success_criteria:
  - 04-e2e-cases.md のP0全14件がPlaywright(AI_MODE=fixture)で通過する
  - `pnpm install && pnpm db:setup && pnpm dev` の3コマンドで起動できる
  - オンボーディング(サインアップ→同期→最初の提案承認)がUI操作のみで完結する
  - ANTHROPIC_API_KEY を設定すれば AI_MODE=live で同一コードパスが動作する

## プロダクト要求(要約)

**1文**: メールを取り込むとCRMが自動で組み上がり、チャットで営業を指示できる self-driving CRM。

**コア価値(優先順)**:
1. **detect→draft→approve ループ**: 取り込んだメールからAIがディール/コンタクト/更新/タスクを提案し、人間は承認するだけ(AIF-001, SCR-010)
2. **チャット=UI**: パイプラインへの質問とフォローアップ指示を自然言語で(AIF-002/003, SCR-004)
3. **最小で完全なCRM**: カンバン・ディール詳細タイムライン・コンタクト/企業・タスク(SCR-005〜008, 013)
4. **MCPファースト**: UIとAIエージェントが同一サービス層を使う。外部AIツールからMCPで全操作可能(03-api.md)

**アーキテクチャ制約**(spec全体に埋め込み済み):
- メールはプロバイダ非依存(fixtureメールボックス+取込API)。Gmail連携はアダプタ追加のみで載る構造にする
- AI呼び出しは単一クライアント+Fixtureモード(05-ai-features.md)。E2Eは決定的に走る
- 技術スタック(teardown 9より): Next.js(App Router)+ PostgreSQL + Prisma + Claude API + Playwright。UIは日本語 [ASSUMED: ユーザー言語より。ja/enの文言テーブル分離推奨]

## ASSUMED一覧(spec全体)

| 箇所 | 仮定 | 理由 |
|---|---|---|
| SCR-001 | Google OAuthでなくメール+パスワード | E2E決定性・外部依存排除。OAuth追加は次版 |
| SCR-005 | stuck判定=10日 | Octolaneのチャット例「10日動いていない」より |
| SCR-005 | Won移動時の演出 | 品質向上の推定追加 |
| 02-schema | 通貨デフォルトUSD、金額は最小通貨単位のInt | ベンチマークが米国製品のため |
| 02-schema | シード内容(デモユーザー/6通のfixtureメール) | E2Eの決定性確保 |
| 00-prd | UI言語=日本語 | ユーザーとの会話言語。要確認 |
| 全体 | 価格・課金はスコープ外 | teardownの価格情報が[要確認]のままのため、課金設計は確定情報入手後 |
