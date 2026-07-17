# SCR-019: セッション詳細/リプレイ
- route: /app/[aiId]/sessions/[sessionId]
- auth: authenticated
- purpose: 個別セッションの全記録(トランスクリプト・イベント・資格確認)の分析

## Layout
```
+--sidebar--+---------------------------------------+
|           | 田中(ACME)・2026-07-17 10:00・12分     |
|           | +--資格確認(AIF-005)---------------+  |
|           | | 用途: プロジェクト管理 | 規模: 20名  |  |
|           | | 導入時期: 今四半期 | 関心度: ★★★★☆ |  |
|           | | 要約: …                           |  |
|           | +----------------------------------+  |
|           | タイムライン(トランスクリプト+イベント統合)|
|           |  10:00 ▶ セッション開始(ja)            |
|           |  10:01 [AI] こんにちは…(Step1表示)     |
|           |  10:03 [買い手] How much…              |
|           |  10:03 🌐 ja→en に切替                 |
|           |  10:05 ⚠ 未回答質問を記録「SSO対応?」    |
+-----------+---------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| QualificationCard | AIF-005の抽出結果。未生成(ACTIVE中)は非表示 | Qualification |
| Timeline | TranscriptTurnとSessionEventをcreatedAtでマージ表示。STEP_SHOWNは「Step n: タイトル 表示」、LANGUAGE_SWITCHは🌐、GAP_RECORDEDは⚠+SCR-013へのリンク | TranscriptTurn, SessionEvent |
| AiTurnMeta | AIターン展開で参照KnowledgeNodeタイトルを表示(透明性) | TranscriptTurn.meta |

## States
- loading: スケルトン
- error: 存在しないID→404
- success: 上記表示。ACTIVEセッションは「進行中」バッジ+自動更新(ポーリング)

## Interactions
- ⚠ギャップ行のリンク → SCR-013(該当ギャップがハイライトされた状態)
- 資格確認カードの要約はコピー可能

## AI Behaviors
- none(生成済みデータの表示のみ)
