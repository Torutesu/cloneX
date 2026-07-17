# PRD: Sable clone — 製品を実演しながら喋るAIデモ社員

- version: 1
- source_teardown: ../teardown.md
- target_users: B2B SaaSのGTMチーム(デモ・オンボーディングを人手でスケールできない層)。買い手(エンドユーザー)は認証不要で体験
- mvp_scope: [SCR-001, SCR-002, SCR-003, SCR-010, SCR-011, SCR-012, SCR-013, SCR-014, SCR-015, SCR-017, SCR-018, SCR-019, SCR-020]
- out_of_scope:
  - **課金・プラン管理(SCR-023相当)— 一切作らない [USER-REQ]**
  - フォトリアルなdigital humanアバター(簡易SVGアニメアバターで代替 [USER-REQ: 簡易でよいので必ず入れる])
  - 本物のVM(LiveBox)プロビジョニング — バンドルのサンプル製品(/demo-target)+iframe+擬似カーソルで代替
  - SCR-016 リハーサル専用画面(SCR-002の?mode=rehearsalで代替)、SCR-021 ハンドオフ/CRM連携(資格確認はSCR-019表示まで)、SCR-022 チーム/権限(1ワークスペース=1ユーザー)
  - WebRTC/リアルタイム音声通話基盤(音声はWeb Speech APIのTTS/STT。テキストチャットが正)
  - ビデオ入力(買い手カメラ)、iOSアプリ、SSO/SAML/監査ログ、実メール送信、埋込ウィジェット本体(リンクを開くスニペットまで)
  - self-healing demo、フォローアップ自動送信、ペルソナ自動改善(05-ai-features.md末尾)
- success_criteria:
  - 04-e2e-cases.md のP0全17件がPlaywright(AI_MODE=fixture)で通過する
  - `pnpm install && pnpm db:setup && pnpm dev` の3コマンドで起動できる
  - 管理者フロー(サインアップ→URL投入→Brain構築→公開)と買い手フロー(リンク→ライブデモ→要約)がUI操作のみで完結する
  - ANTHROPIC_API_KEY を設定すれば AI_MODE=live で同一コードパスが動作する

## プロダクト要求(要約)

**1文**: 製品URLを渡すとAI社員が立ち上がり、共有リンク先で買い手に製品をライブ実演(操作+ナレーション+Q&A、言語即時切替つき)する「AIデモ社員」。

**コア価値(優先順)**:
1. **ライブデモ体験**: デモステージ(iframe+AIカーソル+ハイライト)をアバター付きAIが進行し、質問に即答する(SCR-002、AIF-002/004)。Sableの「Interactive Intelligence」の縮小再現
2. **多言語即時切替**: 買い手が言語を変えれば会話・ナレーション・UIがその場で追従する(AIF-003)[USER-REQ]
3. **ゼロタッチBrain**: URL 1本からナレッジ+デモシナリオ+挨拶を自動生成。以後はギャップ検出→回答作成の改善ループ(AIF-001/002/006、SCR-012/013)
4. **セッションの完全な記録と示唆**: トランスクリプト・イベント・資格確認・インサイト(SCR-018/019/020、AIF-005/006)

**アーキテクチャ制約**(spec全体に埋め込み済み):
- AI呼び出しは単一クライアント+Fixtureモード(05-ai-features.md)。E2Eは決定的に走る
- デモステージはroute+selector駆動。バンドルのサンプル製品「TaskFlow」(/demo-target/*)を同梱し、シード・fixture・E2Eすべてこれを対象とする。実プロダクトURLへの差し替えはDemoStep.routeの変更で可能な構造にする
- 音声は progressive enhancement(TTS/STTはWeb Speech API、`NEXT_PUBLIC_TTS=off`で無効化)。機能の正はテキスト
- 技術スタック: Next.js(App Router)+ PostgreSQL + Prisma + Claude API + Playwright + Tailwind。UIは日本語ベース+セッション内は4言語 [ASSUMED: octolane specと同一スタック。リポジトリ既存scaffoldに準拠]
- ビルド先: リポジトリ内の独立アプリとして実装(octolaneクローンとはコード共有しない)[USER-REQ: 別プロダクト。配置はStage 3冒頭で確定]

## ASSUMED一覧(spec全体)

| 箇所 | 仮定 | 理由 |
|---|---|---|
| SCR-010 | メール+パスワード認証(SSOなし) | E2E決定性・外部依存排除。octolane specと同判断 |
| SCR-002 | sessionId所持のみでアクセス可(追加トークンなし) | MVP簡略化。公開リンク前提のため実害小 |
| SCR-002 | 音声=Web Speech API、テキストが正 | リアルタイム音声APIは外部依存+E2E非決定的 |
| 02-schema | 対応言語= ja/en/zh/es の4言語 | Sableの「英→中→西」デモ実話+日本市場向けja。Persona.languagesで拡張可能 |
| 02-schema | Persona.displayName デフォルト「Sana」 | Aidan相当の固有名。ブランド回避のため独自名 |
| 02-schema | 商談録音はテキスト(文字起こし済み)で受ける | 音声ファイル処理はMVP外 |
| 02-schema | Qualification.interest は1-5尺度 | Sableのスコア仕様が不明なため独自定義 |
| AIF-002 | ナレッジ全件をプロンプト注入(ベクトル検索なし) | MVP規模(数十ノード)では十分。pgvectorは次版 |
| AIF-003 | fixtureの言語判定は文字種ヒューリスティック | E2E決定性確保 |
| SCR-014 | route先の埋込可否(X-Frame-Options)は検証しない | サンプル製品前提。実URL対応時の課題として記録 |
| 00-prd | ビルド先=独立アプリディレクトリ | 「別プロダクトとして」[USER-REQ]。Stage 3で位置確定 |
