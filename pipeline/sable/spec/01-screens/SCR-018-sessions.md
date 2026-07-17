# SCR-018: セッション一覧
- route: /app/[aiId]/sessions
- auth: authenticated
- purpose: AI社員が実施した全ライブセッションの監視(F3の起点)。選択中AI社員のホーム画面

## Layout
```
+--sidebar--+---------------------------------------+
|           | セッション  [進行中のみ□] [言語▼]       |
|           | | 買い手 | 会社 | 言語 | 状態 | 開始 | 長さ | Q |
|           | | 田中  | ACME | ja→en | ENDED | … | 12分 | ✓ |
|           | | (匿名) | -   | ja    | ACTIVE ●| … | -  | - |
+-----------+---------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| SessionTable | 新しい順。言語列はLANGUAGE_SWITCHがあれば「ja→en」表記。Q列=Qualification有無。ACTIVEは●パルス表示。行クリック→SCR-019 | Session, SessionEvent |
| Filters | 状態・言語でフィルタ | - |

## States
- empty: 「まだセッションがありません。配備(SCR-017)からリンクを共有しましょう」
- loading: スケルトン
- success: テーブル表示

## Interactions
- 行クリック → SCR-019
- mode=REHEARSALのセッションは表示しない(またはフィルタでのみ表示)[ASSUMED: デフォルト非表示]

## AI Behaviors
- none
