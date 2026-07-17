# AI Features: cloneX (Octolane clone)

- version: 1
- 由来: teardown セクション7から採用: 7-1(MCPファースト→03-api.md参照)、7-2の簡易版(AIF-004)、コア機能のAI仕様(AIF-001〜003)
- 共通実装要件は末尾「Fixtureモード」参照

## AIF-001: メール解析→提案生成(detect → draft)
- trigger: イベント(POST /api/ingest/email、mailbox/sync での各メール取込時)
- input_context: 対象EmailMessage(from/件名/本文)+ワークスペースの既存Company(name/domain)・Contact(name/email)・Deal(name/stage/amount)・Stage名一覧のダイジェスト
- model_tier: mid (Sonnet級)
- output: AiProposalを0..N件生成(構造化出力で `{proposals: [{type, confidence, payload}]}` を返させ、Zodでバリデーション)
  - 判定ルール: 送信者emailが既存Contactに一致し既存Dealあり→FIELD_UPDATE/TASK系。未知の送信者+商談意図→NEW_DEAL(コンタクト・企業込み)。商談と無関係(ニュースレター等)→提案0件
  - 生成後、AutoApprovePolicyを評価し confidence≥threshold かつ enabled なら即実体化(status=AUTO_APPROVED)。それ以外はPENDING
- fallback: AI呼び出し失敗時はEmailMessage.processedAtをnullのまま残し、syncレスポンスに `failed: n` を含める。SCR-002/015は赤帯+[再試行](未処理メールのみ再解析)。ユーザーのデータは一切変更しない
- e2e_ref: [E2E-003, E2E-013, E2E-014]

## AIF-002: チャットNLクエリ(自然言語→構造化検索→要約回答)
- trigger: ユーザー操作(SCR-004でメッセージ送信、意図が「質問」の場合)
- input_context: ユーザーメッセージ+直近10往復のチャット履歴+ツール定義(deals_search / contacts_search / tasks_list / activities_list — 03-api.mdのMCPツールと同一実装)
- model_tier: mid (Sonnet級)
- output: tool useループ(最大5回)で検索を実行し、結果を日本語で要約。参照エンティティは `{type: "deal_ref", id}` 形式で返しUIがDealRefCardとして描画。実行ツール名はtoolCallsに記録し表示
- fallback: 失敗時は「応答を生成できませんでした [再試行]」(ChatMessageは保存しwarningフラグ)。検索0件は失敗ではなく「見つかりませんでした」+検索条件の言い換え提案
- e2e_ref: [E2E-010, E2E-018]

## AIF-003: チャット指示→フォローアップ草稿(act with approval)
- trigger: ユーザー操作(SCR-004でメッセージ送信、意図が「アクション指示」の場合。意図分類はAIF-002と同一呼び出し内でtool選択として実現)
- input_context: 指示文+対象Contactの解決結果+紐づくDealのタイムライン直近10件(メール本文含む)+ノート
- model_tier: high (Fable/Opus級)[理由: 顧客に送る文面の品質が製品価値に直結]
- output: `draft_followup` ツールが `{contactId, dealId?, subject, body, reason}` を生成→DraftPreviewCardとして表示。ユーザーが[承認キューに入れる]を押した時のみAiProposal(DRAFT_EMAIL, source=CHAT)を作成。承認時の実体化はSCR-010(実送信せずCHAT_ACTION Activityを記録)
- fallback: 対象コンタクトが一意に解決できない場合は候補リストを提示して聞き返す(草稿を作らない)。AI失敗時はAIF-002と同じ再試行UI
- e2e_ref: [E2E-011]

## AIF-004: 自動承認ポリシー適用
- trigger: イベント(AIF-001の提案生成直後、同一トランザクション内)
- input_context: 生成された提案のtype/confidence+該当AutoApprovePolicy
- model_tier: light [注: AI呼び出しなしの決定的ルール(confidence≥threshold AND enabled)。しきい値の学習化(teardown 7-2)はout_of_scope、将来版]
- output: 条件成立で即実体化(SCR-010の実体化ルールを共用)+status=AUTO_APPROVED。履歴に⚡表示
- fallback: 実体化中のエラー(整合性違反等)時はstatusをPENDINGに戻し通常キューに積む(ユーザーが手動で判断できる)
- e2e_ref: [E2E-013]

## Fixtureモード(全AIF共通・E2E決定性の要)

- 環境変数 `AI_MODE=live | fixture`(デフォルト: fixture。`ANTHROPIC_API_KEY` があればliveも選択可)
- 実装: `src/lib/ai/client.ts` に単一の呼び出し口を置き、fixtureモードでは `fixtures/ai/` 配下のJSONを返す
  - AIF-001: fixtureメールはファイル内に `expectedProposals` を同梱(メールID→提案の決定的マッピング)
  - AIF-002/003: 正規化した入力パターン(E2Eで使う文言)→応答のマッピング。未定義入力はエラーを返す(E2E-018で使用)
- fixtureとliveでコードパスを分岐させない(返り値の差し替えのみ)。構造化出力のZodスキーマは両モード共通
