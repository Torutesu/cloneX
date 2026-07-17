# SCR-004: AIチャット
- route: /app/chat
- auth: authenticated
- purpose: 自然言語でパイプラインに質問し(AIF-002)、フォローアップ等のアクションを指示する(AIF-003)。本プロダクトの主インターフェース

## Layout
```
+--sidebar--+------------------------------------------+
|           | メッセージ履歴(スクロール)                |
|           |  [USER] 10日動いてないディールは?         |
|           |  [AI] 2件あります: (ディールカード×2)      |
|           |  [AI] 草稿を作りました: (草稿プレビュー     |
|           |       [承認キューへ] ボタン付き)           |
|           +------------------------------------------+
|           | [入力欄  /コマンド対応          ] [送信]   |
+-----------+------------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| MessageList | ChatMessage時系列表示。AIメッセージ内のディール参照はSCR-006へのリンクカードで表示 | ChatMessage |
| ChatInput | Enterで送信(POST /api/chat)。`/` 入力でコマンドパレット表示: `/deals` `/contacts` `/tasks` `/followup` | - |
| CommandPalette | 選択でテンプレ挿入(例: `/followup ` → 「(名前)にフォローアップして」) | - |
| DealRefCard | AI回答中のディール参照。名前/ステージ/金額/最終更新。クリック→SCR-006 | Deal |
| DraftPreviewCard | AIF-003の草稿(宛先/件名/本文)。[承認キューに入れる]→POST /api/proposals→作成済みの旨を表示、[破棄] | AiProposal(DRAFT_EMAIL) |

## States
- loading: 送信後、AI応答までタイピングインジケータ
- empty: 履歴0件時はサンプルプロンプト3つをチップ表示(「動いていないディールは?」「今週のタスクは?」「(コンタクト名)にフォローアップして」)
- error: AI応答失敗時は「応答を生成できませんでした [再試行]」(fallback: AIF-002/003)
- success: 通常表示

## Interactions
- 質問(例「stuck deals見せて」)→ AIF-002がDBを検索して回答+DealRefCard表示
- 指示(例「田中さんにフォローアップして」)→ AIF-003が文脈収集→DraftPreviewCard表示 → [承認キューに入れる] → SCR-010にDRAFT_EMAIL提案が積まれる
- 対象コンタクトが特定できない場合、AIは候補リストを提示して聞き返す

## AI Behaviors
- AIF-002(NLクエリ→構造化検索→要約回答)
- AIF-003(フォローアップ草稿生成→承認ループ投入)
- AIの全ツール実行はtoolCallsに記録し、メッセージ下に「🔍 deals.search を実行」のように表示(透明性)
