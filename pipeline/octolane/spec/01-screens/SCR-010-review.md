# SCR-010: 承認キュー(Review)★製品の心臓部
- route: /app/review
- auth: authenticated
- purpose: AI提案(detect→draft)を人間が1クリックで承認/却下する。信頼の獲得装置

## Layout
```
+--sidebar--+------------------------------------------------+
|           | フィルタ: [全て|新規ディール|コンタクト|更新|草稿|タスク] |
|           | +--------------------------------------------+ |
|           | | 🤖 NEW_DEAL  confidence 0.92   via ✉メール   | |
|           | | 「Acme社との商談」 $12,000 / 田中太郎(champion)| |
|           | | 根拠: "見積もりを送ってください…" (原文リンク)   | |
|           | |               [承認] [却下] [編集して承認]     | |
|           | +--------------------------------------------+ |
|           | (承認済み/却下済みは下部の履歴セクションに移動)    |
+-----------+------------------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| FilterTabs | ProposalTypeでフィルタ(クエリパラメータ`type`) | - |
| ProposalCard | type別の内容レンダリング(payload仕様は02-schema.md)。confidenceバッジ(≥0.9緑/≥0.7黄/未満グレー)。sourceの原文をアコーディオン展開(EmailMessage.bodyText) | AiProposal |
| ApproveButton | POST /api/proposals/:id/approve → 実体化(下記)。`data-testid="approve-<id>"` | 全モデル |
| RejectButton | POST /api/proposals/:id/reject → status=REJECTED | AiProposal |
| EditApproveButton | payloadをフォームで編集→編集後の内容で承認 | AiProposal |
| HistorySection | 直近20件のAPPROVED/AUTO_APPROVED/REJECTED。AUTO_APPROVEDには⚡バッジ | AiProposal |

## 承認時の実体化ルール(type別)
- NEW_DEAL: Company(domainで既存マッチ、なければ作成)→Contact(email既存マッチ)→Deal(stageName→Stage解決)→DealContact→taskTitleあればTask(source=AI)→Activity(SYSTEM「AIがディールを作成」+EMAIL原文リンク)
- NEW_CONTACT: Contact作成(companyName→既存マッチ or 作成)
- FIELD_UPDATE: 対象Dealの該当フィールド更新+Activity(SYSTEM、oldValue→newValue)
- DRAFT_EMAIL: Activity(CHAT_ACTION「フォローアップを送信: <件名>」)を記録(実送信はMVP外 — 送信済み扱い)
- TASK: Task作成(source=AI)+Activity(TASK)

## States
- loading: カードスケルトン
- empty: 「レビュー待ちの提案はありません 🎉」
- error: 承認失敗時カード上に赤帯+[再試行](提案はPENDINGのまま)
- success: 承認→カードが緑フラッシュして履歴へ移動

## Interactions
- [承認] → 実体化 → 成功トースト「ディール『Acme社との商談』を作成しました [開く]」([開く]→SCR-006)
- [却下] → 即時REJECTED(取り消しトースト5秒)
- 承認/却下でサイドバーのReviewバッジ件数が即時減算

## AI Behaviors
- AutoApprovePolicy(SCR-015で設定)が有効なtypeは、AIF-001生成時点でconfidence≥thresholdならAUTO_APPROVEDとして即実体化し、このキューには履歴のみ表示
