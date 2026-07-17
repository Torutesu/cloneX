# SCR-014: デモシナリオ編集(LiveBox簡易版)
- route: /app/[aiId]/scenario
- auth: authenticated
- purpose: AI社員がデモステージで実演する手順(ステップ列)の閲覧・編集

## Layout
```
+--sidebar--+---------------------------------------+
|           | シナリオ: 基本デモ(デフォルト)          |
|           | +--Step1--------------------------+   |
|           | | ダッシュボード概要                |   |
|           | | route: /demo-target/dashboard   |   |
|           | | selector: .kpi-cards            |   |
|           | | ナレーション: [ja][en][zh][es]タブ |   |
|           | | [↑][↓][✏️][🗑]                   |   |
|           | +---------------------------------+   |
|           | [+ ステップを追加]  [プレビュー]        |
+-----------+---------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| StepCard | order順に表示。↑↓で並べ替え(orderを振り直し) | DemoStep |
| StepEditModal | title/route/selector/narration(4言語タブ)を編集。routeはバンドルのサンプル製品パス or 任意URL [ASSUMED: 埋込可否の検証はしない] | DemoStep |
| NarrationTabs | 言語タブ。未入力言語には[AIで翻訳]ボタン→他言語のnarrationから生成 | DemoStep.narration |
| PreviewButton | ステップのroute+selectorをミニステージで表示確認(カーソル移動含む) | - |

## States
- empty: シナリオ未生成(brainStatus≠READY)→「Brain構築後に自動生成されます。手動作成も可能です [+作成]」
- error: 保存失敗トースト
- success: ステップ一覧

## Interactions
- ステップ編集・並べ替え・追加・削除 → 即保存 → SCR-002の次回セッションに反映
- [プレビュー] → モーダルでステージ表示(セッションは作らない)

## AI Behaviors
- [AIで翻訳]: narrationの他言語生成(AIF-003と同じ翻訳基盤)。fallback: 手動入力
- AIF-001がシナリオ初期案(4ステップ程度)を自動生成済み
