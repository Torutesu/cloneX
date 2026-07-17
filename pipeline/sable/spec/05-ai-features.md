# AI Features: Sable clone

teardown.md セクション7から採用したAIネイティブ機能の仕様。

## 共通アーキテクチャ

- 全AI呼び出しは単一クライアント `lib/ai/client.ts` 経由
- `AI_MODE=fixture`(既定): 意図キー(intent)ごとの決定的固定応答。E2Eはこのモードで走る
- `AI_MODE=live`: ANTHROPIC_API_KEY で実LLM(claude-sonnet-5等)。fixtureと同一のコードパス・同一のJSON出力スキーマ
- fixtureの言語判定: 文字種ヒューリスティック(ひらがな/カタカナ→ja、漢字のみ→zh、それ以外はキーワード辞書でen/es)[ASSUMED: 決定性確保のため。liveモードではLLMが判定]

## AIF-001: Brainゼロタッチ構築(teardown 7-1)
- trigger: ユーザー操作(SCR-011 [構築開始] / SCR-012 ソース追加で増分実行)
- input_context: AiEmployee(productName/productUrl)、対象Source群のcontent(PRODUCT_URLはサーバ側fetch。fixtureモードではバンドルのサンプル製品テキストを使用)
- model_tier: high(構造化抽出の品質が下流全体を決めるため)
- output:
  - KnowledgeNode群(FEATURE/FAQ/OBJECTION、fixtureでは固定8件)
  - デフォルトDemoScenario 1本+DemoStep 4件(route/selector/4言語narration。routeはバンドルのサンプル製品 /demo-target/* を指す)
  - Persona.greeting(4言語)
  - 増分モード(ソース追加時): KnowledgeNode追加のみ。isEdited=trueの既存ノードは変更しない
- fallback: brainStatus=FAILEDにし、SCR-011/012に「[再試行] または手動でソース・ナレッジを追加」を表示。手動作成(SCR-013/014)だけでも運用可能な構造とする
- e2e_ref: [E2E-003, E2E-021]

## AIF-002: Brain参照のリアルタイムQ&A+知識ギャップ記録(teardown 7-6)
- trigger: イベント(買い手のメッセージ送信 POST /api/public/sessions/:id/messages)
- input_context: 直近のTranscriptTurn(最大20)、KnowledgeNode全件(タイトル+本文。MVPは全件注入、ベクトル検索は次版 [ASSUMED])、現在のDemoStep、Persona(tone/displayName)
- model_tier: mid
- output: JSON `{answer, referencedNodeIds[], confident: boolean}`。confident=falseなら「持ち帰って確認します」型の正直な回答+KnowledgeGap作成+GAP_RECORDEDイベント。referencedNodeIdsはTranscriptTurn.metaに記録し「📚 n件参照」表示に使う
- fallback: AI呼び出し失敗時はaiTurnを作らず、UI側に「応答を生成できませんでした [再試行]」を表示(会話履歴は壊さない)
- e2e_ref: [E2E-009, E2E-011, E2E-014]

## AIF-003: 多言語即時切替 [USER-REQ](teardownでは Drop 予定だったがユーザー指示で採用)
- trigger: イベント(買い手メッセージの言語がSession.languageと異なる時 / 言語バッジの手動切替)
- input_context: 買い手メッセージ、Persona.languages(対応言語ホワイトリスト)
- model_tier: light(言語判定・翻訳。応答生成自体はAIF-002/004が現在言語で行う)
- output: Session.language更新、LANGUAGE_SWITCHイベント、directives.language(UI即時反映)。以後のAI応答・narration・UI文言が新言語になる。narrationは保存済み4言語(DemoStep.narration)から取得し、欠落言語のみ翻訳生成
- fallback: 判定不能・非対応言語の場合は現在言語を維持(切替しない)。翻訳失敗時はja/enの保存済みnarrationで代替
- e2e_ref: [E2E-010, E2E-022, E2E-020]

## AIF-004: デモ進行エージェント(teardown 7-3の縮小版)
- trigger: イベント(買い手メッセージ処理時に同時判断)
- input_context: 買い手メッセージ、DemoStep一覧(title/narration)、Session.currentStepOrder
- model_tier: mid(AIF-002と同一呼び出しに統合し、1レスポンスで {answer, jumpToStepOrder?} を返す)
- output: 質問が特定ステップの内容に対応する場合 directives.stepOrder を返し、ステージをそのステップへ遷移+STEP_SHOWN記録(「実際にお見せしますね」を回答に含める)
- fallback: 判断失敗時はジャンプせず回答のみ(手動[次へ]は常に機能する)
- e2e_ref: [E2E-008, E2E-018]

## AIF-005: セッション要約+資格確認(teardown 7-5の縮小版)
- trigger: イベント(POST /api/public/sessions/:id/end)
- input_context: 全TranscriptTurn、SessionEvent(見たステップ・言語切替)、buyerName/Company
- model_tier: mid
- output: Session.summary(終了時点の言語で生成)+ Qualification {useCase?, teamSize?, timeline?, interest(1-5), summary}。会話から読み取れない項目はnull(捏造しない)
- fallback: 失敗時はsummary=null(SCR-003は感謝メッセージ+トランスクリプトのみ表示)。Qualificationも作らない。endは常に成功させる(要約失敗でセッションが終了できないのは不可)
- e2e_ref: [E2E-012, E2E-013]

## AIF-006: インサイト集約+回答下書き(teardown 7-4の縮小版)
- trigger: ユーザー操作(SCR-020 [再生成] / SCR-013 [回答を作成]のAI下書き)
- input_context: 対象AI社員のLIVE・ENDED全セッションの買い手TranscriptTurn+KnowledgeGap、KnowledgeNode一覧
- model_tier: mid
- output: InsightReport.payload `{topQuestions: [{question, count, answered, gapId?}], suggestions: [string]}`(質問の意味クラスタリング)。draft-answer: ギャップ質問への回答下書き {title, body}
- fallback: 生成失敗時は既存レポートを表示継続+エラートースト。統計タイル(DB集計)は常に表示。draft-answer失敗時は空欄フォーム
- e2e_ref: [E2E-015]

## 採用しなかったAIネイティブ機会(teardown 7より)

- 7-2 self-healing demo: 実ブラウザ巡回が必要でMVP環境に合わない → out_of_scope
- 7-5のフォローアップメール自動送信: メール送信基盤が必要 → out_of_scope(要約表示まで)
- 7-7 セッション横断のペルソナ自動改善: データ量が前提 → out_of_scope
