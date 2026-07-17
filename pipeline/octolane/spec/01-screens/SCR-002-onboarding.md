# SCR-002: オンボーディング
- route: /onboarding
- auth: authenticated
- purpose: ワークスペース作成→メールボックス接続→初回同期で「CRMが自動で立ち上がる」15分体験を再現する

## Layout
2ステップウィザード(上部にステップインジケータ)。

```
Step 1: ワークスペース作成          Step 2: メールボックス接続
+---------------------------+     +----------------------------------+
| ワークスペース名 [       ] |     | [メールボックスを接続] ボタン      |
| [作成して次へ]             |     | 接続後: 同期進捗バー + ログ行      |
+---------------------------+     | 「N件のメールを解析 → M件の提案」   |
                                  | [提案を確認する →]                |
                                  +----------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| WorkspaceNameInput | 必須 | Workspace |
| CreateWorkspaceButton | POST /api/workspaces → Step 2へ | Workspace, Pipeline, Stage(デフォルト生成) |
| ConnectMailboxButton | POST /api/integrations/mailbox/connect(fixtureメールボックスを接続扱いにする) | EmailThread, EmailMessage |
| SyncProgress | POST /api/integrations/mailbox/sync を呼び、同期完了までポーリング(GET /api/integrations/mailbox/status)。完了で「X件の提案が生成されました」 | AiProposal |
| GoToReviewButton | SCR-010へ遷移 | - |

## States
- loading: 同期中は進捗バー+「メールを解析しています…」
- empty: 該当なし(fixtureは常に6通)
- error: 同期失敗時は赤帯+[再試行]ボタン(AIF-001のfallback: 05-ai-features.md)
- success: 「6件のメールから4件の提案が生成されました」のようなサマリー表示

## Interactions
- ワークスペース作成 → デフォルトパイプライン(Lead/Qualified/Proposal/Negotiation/Won/Lost)が自動生成される
- 接続→同期完了 → [提案を確認する] → SCR-010
- 既にワークスペースがあるユーザーが/onboardingへ来た場合 → SCR-003へリダイレクト

## AI Behaviors
- 同期時にAIF-001(メール解析→提案生成)が走る。UIは件数と種別サマリーだけ表示し、中身の確認はSCR-010に委ねる
