# SCR-015: 設定(連携 / 自動承認 / API・MCP)
- route: /app/settings
- auth: authenticated
- purpose: メールボックス連携の管理、自動承認しきい値の設定、APIトークン/MCP接続情報の表示(teardown SCR-015/017を統合)

## Layout
縦3セクション: 「メール連携」「自動承認」「API & MCP」。

## Components
| Component | Behavior | Data |
|---|---|---|
| MailboxSection | 接続状態表示。[今すぐ同期]→POST /api/integrations/mailbox/sync(SCR-002と同じ。追加fixtureがなければ「新着はありません」)。[メールを手動追加]→モーダル(from/件名/本文)→POST /api/ingest/email → AIF-001即時実行 | EmailMessage |
| AutoApproveSection | ProposalType別の行: [有効トグル] + しきい値スライダー(0.5〜1.0、0.05刻み、既定0.9)。変更→PUT /api/settings/auto-approve | AutoApprovePolicy |
| ApiTokenSection | トークン一覧(名前/作成日/最終使用)。[新規発行]→モーダルで平文を1回だけ表示。[失効]。MCPエンドポイントURL(`/api/mcp`)と接続例(Claude Desktop設定JSON)を表示 | ApiToken |

## States
- loading: セクションごとスケルトン
- empty: トークン0件「トークンがありません」
- error: 保存失敗トースト
- success: 保存成功トースト「設定を保存しました」

## Interactions
- 自動承認を有効化 → 以後のAIF-001生成でconfidence≥thresholdの提案が即実体化される(SCR-010に⚡履歴が残る)
- 手動メール追加 → 解析完了後「提案がN件生成されました [Reviewへ]」トースト

## AI Behaviors
- none(設定値がAIF-001/004の挙動を制御する)
