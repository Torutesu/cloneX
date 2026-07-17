# SCR-020: インサイトダッシュボード
- route: /app/[aiId]/insights
- auth: authenticated
- purpose: 全セッション横断の傾向(頻出質問・つまずき・知識ギャップ)を把握し、Brain改善につなげる(F3の終点)

## Layout
```
+--sidebar--+---------------------------------------+
|           | [セッション数] [平均時間] [質問数] [ギャップ数] |
|           |                                       |
|           | ■ 頻出質問トップ5(AIF-006)             |
|           | 1. 料金について(8回)✓回答済             |
|           | 2. SSO対応(3回)⚠未回答 →[回答を作成]    |
|           |                                       |
|           | ■ 改善提案(AIF-006)                    |
|           | ・「SSO」の質問が増えています。FAQ追加を…  |
|           |                                       |
|           | 最終生成: 10:30 [🔄 再生成]              |
+-----------+---------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| StatTiles | セッション数(LIVE・ENDEDのみ)/平均時間/買い手質問総数/OPENギャップ数。DBから直接集計(AIではない) | Session, TranscriptTurn, KnowledgeGap |
| TopQuestions | AIF-006が質問をクラスタリングした結果。未回答クラスタには[回答を作成]→SCR-013のノード作成モーダルへ | InsightReport |
| Suggestions | AIF-006の改善提案リスト | InsightReport |
| RegenerateButton | POST /api/ai-employees/:id/insights → 生成中スピナー → 新レポート表示 | InsightReport |

## States
- empty: セッション0件「セッションが集まるとインサイトが表示されます」
- loading: レポート生成中はStatTilesのみ先に表示
- error: 生成失敗 →「インサイトを生成できませんでした [再試行]」。StatTilesは常に表示(AIF-006 fallback)
- success: 上記表示

## Interactions
- [回答を作成] → SCR-013(質問文プリセット済みモーダル)
- [再生成] → 最新セッションを含めて再集計

## AI Behaviors
- AIF-006(質問クラスタリング+改善提案。結果はInsightReportにキャッシュ)
