# SCR-001: デモ入口ページ(買い手向け)
- route: /d/[slug]
- auth: public
- purpose: 買い手がAI社員とのライブデモセッションを開始する入口。ベンダーが共有するリンクの着地点

## Layout
```
+--------------------------------------------------+
|              [アバター(大・アイドル動作)]         |
|        「{productName} のデモへようこそ」          |
|   「{persona.displayName} が製品をご案内します」    |
|                                                  |
|   [お名前(任意)        ]                         |
|   [会社名(任意)        ]                         |
|   言語: [日本語 ▼]  (ja/en/zh/es)                |
|                                                  |
|          [▶ デモをはじめる]                       |
+--------------------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| AvatarIdle | Personaのプリセット+accentColorでSVGアバターをアイドルアニメーション表示(瞬き・ゆらぎ)[USER-REQ: 簡易アバター] | Persona |
| EntryForm | 名前・会社は任意入力。言語セレクタ初期値はブラウザ言語(対応外ならja)[ASSUMED] | Persona.languages |
| StartButton | POST /api/public/sessions → SCR-002へ遷移 | Session作成 |

## States
- loading: slug解決中はスケルトン
- error: slugが存在しない or status=DRAFT →「このデモは現在利用できません」(404扱い)
- success: 上記フォーム表示

## Interactions
- [デモをはじめる] → セッション作成(選択言語・名前・会社を渡す)→ SCR-002
- 言語セレクタ変更 → ページ内文言(見出し・ボタン)も即時その言語に切替

## AI Behaviors
- none(セッション開始前)
