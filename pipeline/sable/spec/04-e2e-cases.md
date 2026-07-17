# E2E Cases: Sable clone

- 実行: Playwright、`AI_MODE=fixture`(決定的)、`NEXT_PUBLIC_TTS=off`
- 前提: `db:setup` でシード投入済み(02-schema.md「シード」参照)
- **P0全17件の通過がMVP完了条件**

## E2E-001: サインアップして空の管理画面に着地する
- screens: [SCR-010, SCR-011]
- steps:
  1. Given /signup を開く
  2. When 名前・メール(新規)・パスワードを入力し登録する
  3. Then /app に遷移し「最初のAI社員を作成しましょう」の空状態が表示される
- priority: P0

## E2E-002: シードユーザーでサインインする
- screens: [SCR-010, SCR-011]
- steps:
  1. Given /signin を開く
  2. When demo@example.com / demo1234 でサインインする
  3. Then /app に遷移し、AI社員カード「TaskFlow」(PUBLISHED / Brain: READY)が表示される
- priority: P0

## E2E-003: ウィザードでAI社員を作成しBrainが自動構築される
- screens: [SCR-011]
- steps:
  1. Given サインイン済みで /app/new を開く
  2. When Step1で製品名「Acme Board」・製品URL・表示名を入力して進み、Step2で[構築開始]を押す
  3. Then 進捗表示の後「ナレッジ n件・デモシナリオ 4ステップを生成しました」(fixtureの固定件数)が表示され、Step3の導線([ペルソナ設定へ])が現れる
- priority: P0

## E2E-004: アバターとペルソナを設定する [USER-REQ: 簡易アバター]
- screens: [SCR-015]
- steps:
  1. Given TaskFlow社員の /app/[aiId]/persona を開く
  2. When アバターを ROBOT に変更し、表示名を「Robo」に変えて[保存]する
  3. Then 保存トーストが出て、ライブプレビューがROBOTプリセット(data-avatar="ROBOT")で表示される。リロード後も維持される
- priority: P0

## E2E-005: 公開して共有リンクから入口が開ける
- screens: [SCR-017, SCR-001]
- steps:
  1. Given brainStatus=READYのAI社員の /app/[aiId]/deploy を開く
  2. When 公開トグルをONにし、共有リンクをコピーして開く
  3. Then SCR-001が表示され、Persona表示名・アバター・言語セレクタ(ja/en/zh/es)が見える
- priority: P0

## E2E-006: 非公開のデモ入口はブロックされる
- screens: [SCR-017, SCR-001]
- steps:
  1. Given AI社員をDRAFTに切り替える
  2. When /d/[slug] を開く
  3. Then 「このデモは現在利用できません」が表示され、開始ボタンがない
- priority: P0

## E2E-007: 買い手がセッションを開始すると挨拶が再生される
- screens: [SCR-001, SCR-002]
- steps:
  1. Given 公開中の /d/taskflow-demo を開く
  2. When 名前「田中」・会社「ACME」を入力し言語=日本語で[デモをはじめる]を押す
  3. Then SCR-002に遷移し、トランスクリプトに日本語の挨拶(AIターン)が表示され、アバターがspeaking状態(data-state="speaking")→idle状態に遷移する
- priority: P0

## E2E-008: デモステップが進行しステージとナレーションが同期する
- screens: [SCR-002]
- steps:
  1. Given アクティブなセッション(Step未開始)
  2. When [次へ ▶]を押す
  3. Then ステージiframeがStep1のroute(/demo-target/dashboard)を表示し、AIカーソルがselector位置へ移動、ハイライト枠が出る。トランスクリプトに日本語ナレーションが追加され、ステップ表示が「1/4」になる
- priority: P0

## E2E-009: 質問にBrain参照で回答する
- screens: [SCR-002]
- steps:
  1. Given アクティブなセッション
  2. When 「料金を教えて」と送信する
  3. Then 料金FAQ(シードのKnowledgeNode)に基づく回答が表示され、AIターンに「📚 1件参照」が表示される
- priority: P0

## E2E-010: 会話の途中で言語が即時切替される [USER-REQ: 多言語即時切替]
- screens: [SCR-002]
- steps:
  1. Given 日本語で進行中のセッション(挨拶済み)
  2. When 「How much does it cost?」と英語で送信する
  3. Then AIの回答が英語で返り、言語バッジが「🌐 English」に変わり、トランスクリプトに「— English に切替 —」区切りが入る。以後[次へ]のナレーションも英語になる
- priority: P0

## E2E-011: 答えられない質問は正直に認め知識ギャップとして記録される
- screens: [SCR-002]
- steps:
  1. Given アクティブなセッション
  2. When 「SSOには対応していますか?」(シードBrainに存在しない質問)と送信する
  3. Then AIが「確認して追ってご連絡します」旨を回答し、トランスクリプトに⚠マークが付く。DB上にOPENなKnowledgeGapが作成される(SCR-013で後述検証)
- priority: P0

## E2E-012: セッションを終了すると要約が表示される
- screens: [SCR-002, SCR-003]
- steps:
  1. Given 質問2件・ステップ2進行済みのセッション
  2. When [終了]を押し確認する
  3. Then SCR-003に遷移し、「本日のまとめ」に見た機能と質問の要約が表示され、[製品サイトを見る]リンクとトランスクリプト全文アコーディオンがある
- priority: P0

## E2E-013: 管理者がセッション一覧と詳細タイムラインを確認できる
- screens: [SCR-018, SCR-019]
- steps:
  1. Given E2E-007〜012を実施済み(または相当のシードセッション)
  2. When /app/[aiId]/sessions を開き、対象行(田中/ACME/ja→en)をクリックする
  3. Then SCR-019に資格確認カード(用途・関心度・要約)が表示され、タイムラインに 🌐言語切替イベント と ⚠ギャップ記録イベント が時系列で表示される
- priority: P0

## E2E-014: 知識ギャップを解消すると次のセッションから回答できる
- screens: [SCR-013, SCR-002]
- steps:
  1. Given OPENなギャップ「SSOには対応していますか?」がある状態で /app/[aiId]/brain/knowledge を開く
  2. When ギャップバナーの[回答を作成]からbody「SAML SSOに対応しています」を保存する
  3. Then バナーからギャップが消えFAQノードが増える。新規セッションで同じ質問をすると、今度は「📚参照」付きで回答される(⚠は付かない)
- priority: P0

## E2E-015: インサイトが頻出質問と未回答を提示する
- screens: [SCR-020, SCR-013]
- steps:
  1. Given シードのENDEDセッション+E2E実行分がある状態で /app/[aiId]/insights を開く
  2. When [再生成]を押す
  3. Then 統計タイル(セッション数>0)と頻出質問リストが表示され、未回答クラスタに[回答を作成]ボタンが出る。クリックでSCR-013の作成モーダル(質問文プリセット)が開く
- priority: P0

## E2E-016: リハーサルは本番記録に混ざらない
- screens: [SCR-017, SCR-002, SCR-018]
- steps:
  1. Given /app/[aiId]/deploy を開く
  2. When [リハーサルを開始]を押しSCR-002で1問だけ質問して終了する
  3. Then SCR-002上部に「リハーサルモード」バナーが出ていた。SCR-018の一覧にこのセッションは表示されない
- priority: P0

## E2E-017: 買い手がステップを戻れる(co-browsing簡易版)
- screens: [SCR-002]
- steps:
  1. Given Step2まで進行したセッション
  2. When [◀ 前へ]を押す
  3. Then ステージがStep1のrouteに戻り、ステップ表示が「1/4」になる(ナレーションの重複再生はしない: 同一ステップ再訪はSTEP_SHOWNを記録するがAIターンは追加しない)
- priority: P0

## E2E-018: 質問に関連するステップへAIがジャンプ提案する
- screens: [SCR-002]
- steps:
  1. Given Step1表示中のセッション
  2. When 「レポート機能はある?」(fixture上Step3に対応)と送信する
  3. Then AIが回答し、ステージがStep3へ遷移する(directives.stepOrder=3)
- priority: P1

## E2E-019: 挨拶文をAIで生成する
- screens: [SCR-015]
- steps:
  1. When ペルソナ設定で[AIで生成]を押す
  2. Then 4言語タブすべてに挨拶文が入る
- priority: P1

## E2E-020: ナレーションの未入力言語をAI翻訳で埋める
- screens: [SCR-014]
- steps:
  1. Given zhタブが空のステップ編集モーダル
  2. When [AIで翻訳]を押す
  3. Then zhのナレーションが入力される
- priority: P1

## E2E-021: ソース追加で増分学習される
- screens: [SCR-012, SCR-013]
- steps:
  1. When 種別DOCUMENTでテキストを貼り付けて追加する
  2. Then 行がREADYになり「ナレッジがn件増えました」トースト。SCR-013に新ノードが由来ソース名付きで並ぶ
- priority: P1

## E2E-022: 言語バッジから手動で言語を切り替える
- screens: [SCR-002]
- steps:
  1. When 言語バッジから「中文」を選ぶ
  2. Then 以後のAI応答・ナレーションが中国語になり、LANGUAGE_SWITCHイベントが記録される
- priority: P1

## E2E-023: シナリオ編集が次のセッションに反映される
- screens: [SCR-014, SCR-002]
- steps:
  1. When Step1のタイトルとnarration(ja)を書き換えて保存する
  2. Then 新規セッションの[次へ]で新しいナレーションが表示される
- priority: P1
