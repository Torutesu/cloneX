# E2E Cases: cloneX (Octolane clone)

- version: 1
- ランナー: Playwright(chromium)。`AI_MODE=fixture` で起動し、AI応答を決定的にする(05-ai-features.md「Fixtureモード」)
- 前提: `prisma db push && prisma db seed` 済み(シード内容は02-schema.md)。E2E-001以外はseedユーザー `demo@clonex.dev / demo1234` でログインした状態から開始
- P0 = MVP完了の必須条件(clone-buildはP0全通過まで完了扱いにしない)

## E2E-001: サインアップ→オンボーディング導線
- screens: [SCR-001, SCR-002]
- steps:
  1. Given 未ログインで /signup を開く
  2. When 新規メール・パスワード(8文字以上)・名前を入力し「アカウント作成」を押す
  3. Then /onboarding に遷移し、ワークスペース名入力が表示される
  4. When ワークスペース名「Test Inc」を入力し「作成して次へ」を押す
  5. Then Step 2(メールボックス接続)が表示される
- priority: P0

## E2E-002: ログイン
- screens: [SCR-001, SCR-003]
- steps:
  1. Given 未ログインで /login を開く
  2. When `demo@clonex.dev / demo1234` でログインする
  3. Then /app(ダッシュボード)に遷移し、サイドバーとパイプライン概況が表示される
  4. When 誤パスワードで再試行する(別セッション)
  5. Then 「メールまたはパスワードが違います」が表示される
- priority: P0

## E2E-003: メールボックス同期→提案生成(コアループ前半)
- screens: [SCR-002, SCR-010]
- steps:
  1. Given E2E-001の続き(Step 2表示中)
  2. When 「メールボックスを接続」を押し、同期完了を待つ
  3. Then 「6件のメールから4件以上の提案が生成されました」形式のサマリーが表示される
  4. When 「提案を確認する」を押す
  5. Then /app/review にPENDINGの提案カードが表示され、NEW_DEALタイプが2件以上ある
  6. And 各カードにconfidenceバッジと根拠(原文アコーディオン)がある
- priority: P0

## E2E-004: NEW_DEAL承認→パイプライン反映(コアループ後半)
- screens: [SCR-010, SCR-005, SCR-006]
- steps:
  1. Given seedワークスペースの /app/review にNEW_DEAL提案「Acme社との商談」がある
  2. When [承認] を押す
  3. Then 成功トーストが出てカードが履歴セクションに移動、サイドバーReviewバッジが1減る
  4. When /app/pipeline を開く
  5. Then 「Acme社との商談」カードが提案のstageName列に存在する
  6. When カードをクリックする
  7. Then SCR-006が開き、タイムラインに「AIがディールを作成」(SYSTEM)と元メール(EMAIL)が表示される
- priority: P0

## E2E-005: 提案の却下
- screens: [SCR-010, SCR-005]
- steps:
  1. Given /app/review にNEW_DEAL提案「Beta社トライアル」がある
  2. When [却下] を押す
  3. Then カードが履歴にREJECTEDとして移動する
  4. When /app/pipeline を開く
  5. Then 「Beta社トライアル」のカードは存在しない
- priority: P0

## E2E-006: カンバンでステージ移動
- screens: [SCR-005, SCR-006]
- steps:
  1. Given /app/pipeline にseedディール「Gamma社導入」がQualified列にある
  2. When カードをProposal列にドラッグ&ドロップする
  3. Then カードがProposal列に表示され、列ヘッダの件数/金額が両列とも更新される
  4. When ページをリロードする
  5. Then カードはProposal列のまま
  6. When カードを開く
  7. Then タイムライン先頭に「Qualified → Proposal」(SYSTEM)がある
- priority: P0

## E2E-007: ディール詳細のタイムラインとインライン編集
- screens: [SCR-006]
- steps:
  1. Given seedディール(メール活動を持つ)の詳細を開く
  2. Then タイムラインにEMAILアイコンの行があり、クリックで本文が展開される
  3. When 金額を「15000」に編集して確定する
  4. Then ヘッダの金額表示が更新され、タイムラインにSYSTEM行(金額変更)が追加される
  5. When ノート「電話で合意」を追加する
  6. Then ノートタブとタイムラインの両方に反映される
- priority: P0

## E2E-008: コンタクト手動作成(新規企業同時作成)
- screens: [SCR-007]
- steps:
  1. Given /app/contacts を開く
  2. When [+ 追加] で 名前「山田花子」メール「hanako@newco.example」企業に新規名「NewCo」を入力し保存する
  3. Then テーブルに山田花子が表示され、企業列は「NewCo」
  4. When 同じメールで再度追加を試みる
  5. Then モーダル内に「このメールは登録済みです」が表示される
- priority: P0

## E2E-009: 企業詳細の関連表示
- screens: [SCR-008, SCR-007, SCR-006]
- steps:
  1. Given /app/companies からseed企業「Acme」の詳細を開く
  2. Then 所属コンタクトと関連ディールが一覧表示される
  3. When 関連ディールをクリックする
  4. Then SCR-006(該当ディール)に遷移する
- priority: P0

## E2E-010: チャットNLクエリ(stuck deals)
- screens: [SCR-004, SCR-006]
- steps:
  1. Given /app/chat を開く(seedに12日更新なしのディール「Delta社更新」がある)
  2. When 「10日以上動いていないディールを見せて」と送信する
  3. Then AI応答に「Delta社更新」のDealRefCardが含まれ、toolCalls表示「deals_search を実行」がある
  4. When DealRefCardをクリックする
  5. Then SCR-006(Delta社更新)に遷移する
- priority: P0

## E2E-011: チャット→フォローアップ草稿→承認→タイムライン記録
- screens: [SCR-004, SCR-010, SCR-006]
- steps:
  1. Given /app/chat を開く(seedコンタクト「田中太郎」がディール「Acme社導入」に紐づく)
  2. When 「田中太郎さんにフォローアップして」と送信する
  3. Then DraftPreviewCard(宛先: 田中太郎、件名・本文入り)が表示される
  4. When [承認キューに入れる] を押し、/app/review でそのDRAFT_EMAIL提案を[承認]する
  5. Then 「Acme社導入」のタイムラインにCHAT_ACTION「フォローアップを送信」が記録される
- priority: P0

## E2E-012: AI生成タスクの完了
- screens: [SCR-010, SCR-013]
- steps:
  1. Given taskTitle付きNEW_DEAL提案を承認済み(E2E-004の続きでよい)
  2. When /app/tasks を開く
  3. Then 🤖バッジ付きタスクがあり、紐づくディール名が表示される
  4. When チェックボックスで完了にする
  5. Then 打ち消し線→未完了フィルタから消え、ディールのタイムラインにTASK完了が記録される
- priority: P0

## E2E-013: 自動承認(しきい値)
- screens: [SCR-015, SCR-005, SCR-010]
- steps:
  1. Given /app/settings で NEW_DEAL の自動承認を有効化し、しきい値0.9に設定する
  2. When 「メールを手動追加」で高確信fixture(件名「発注確定の件」— AIF-001 fixtureがconfidence 0.95を返す)を追加する
  3. Then トーストに「自動承認されました」が含まれ、/app/pipeline に新ディールが直接出現する
  4. And /app/review の履歴に⚡AUTO_APPROVEDとして記録されている
  5. When しきい値0.99の状態で中確信fixture(confidence 0.8)を追加する
  6. Then そのメールの提案はPENDINGでキューに積まれる(自動承認されない)
- priority: P0

## E2E-014: FIELD_UPDATE承認
- screens: [SCR-015, SCR-010, SCR-006]
- steps:
  1. Given 「メールを手動追加」で金額言及fixture(seedディール「Acme社導入」への返信、「予算は2万ドルで確定です」)を追加する
  2. Then /app/review にFIELD_UPDATE提案(amount: 12000 → 20000)が積まれる
  3. When [承認] する
  4. Then 「Acme社導入」の金額が$20,000になり、タイムラインにSYSTEM(変更前→変更後)が記録される
- priority: P0

## E2E-015: MCPサーバー経由のディール検索
- screens: [SCR-015]
- steps:
  1. Given /app/settings でAPIトークンを新規発行し、平文をコピーする
  2. When MCPクライアント(テストコードからStreamable HTTP接続)で `deals_search` を `{query: "Acme"}` で呼ぶ
  3. Then seedディール「Acme社導入」が結果に含まれる
  4. (注: 本ケースのみUI操作+プロトコルレベル検証のハイブリッド。MCPはUIを持たないため)
- priority: P1

## E2E-016: ダッシュボードからの承認
- screens: [SCR-003]
- steps:
  1. Given PENDING提案がある状態で /app を開く
  2. When 「要承認」カードの[承認]を押す
  3. Then カードが消え、Reviewバッジが減算される
- priority: P1

## E2E-017: 空状態
- screens: [SCR-005, SCR-010, SCR-013]
- steps:
  1. Given 新規作成直後(何も承認していない)ワークスペース
  2. Then pipeline/review/tasksの各画面で仕様どおりの空状態メッセージが表示される
- priority: P1

## E2E-018: AI失敗時のfallback
- screens: [SCR-004]
- steps:
  1. Given `AI_MODE=fixture` で失敗を注入するプロンプト(fixture未定義の入力「__FORCE_ERROR__」)を送信する
  2. Then 「応答を生成できませんでした [再試行]」が表示され、アプリはクラッシュしない
- priority: P1

## E2E-019: モバイルビューポートでの主要動線 [USER-REQ]
- screens: [SCR-001, SCR-003, SCR-005, SCR-010]
- steps:
  1. Given iPhone 13相当のビューポート(390x844)で /login を開きログインする
  2. Then ダッシュボードが1カラムで表示され、水平スクロールが発生していない(document.scrollingElement.scrollWidth <= viewport幅)
  3. When ハンバーガーメニューを開き「Pipeline」をタップする
  4. Then ドロワーが閉じ、パイプラインが表示される。ステージ列は横スクロールで全列に到達できる
  5. When ハンバーガーメニューから「Review」をタップし、PENDING提案カードの[承認]をタップする
  6. Then 承認が成功しカードが履歴に移動する(タップターゲットが操作可能であることの検証)
- priority: P0

## P0一筆書き検証(spec自己検証項目)

E2E-001 → 003(登録→コア価値の初体験)、E2E-002 → 004 → 006 → 007(既存ユーザーのコアループ)、
E2E-010 → 011(チャット価値)で「ユーザー登録→コア価値体験」が一筆書きできる。
課金導線はMVPスコープ外(00-prd.md参照)のためP0に含めない。
