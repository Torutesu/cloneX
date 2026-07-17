# SCR-015: ペルソナ設定
- route: /app/[aiId]/persona
- auth: authenticated
- purpose: AI社員の見た目(アバター)・名前・トーン・対応言語・挨拶文の設定 [USER-REQ: 簡易アバター必須]

## Layout
```
+--sidebar--+---------------------------------------+
|           | [ライブプレビュー: アバターが話すデモ]    |
|           |                                       |
|           | 表示名: [Sana        ]                 |
|           | アバター: (CIRCLE_A)(CIRCLE_B)(ROBOT)(SPARK) |
|           | アクセントカラー: [🎨 #6C5CE7]          |
|           | トーン: (・フレンドリー)( プロ)( 元気)   |
|           | 対応言語: [✓ja] [✓en] [✓zh] [✓es]     |
|           | 挨拶文: [ja][en][zh][es]タブ + [AIで生成]|
|           | [保存]                                 |
+-----------+---------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| AvatarPreviewLive | 選択中プリセット+カラーで speaking/idle/thinking を3秒ごとにループ再生(SCR-002と同一コンポーネント) | Persona |
| AvatarPresetPicker | 4プリセットのラジオ選択。即プレビュー反映 | Persona.avatarPreset |
| LanguageToggles | 対応言語のON/OFF。最低1言語必須。OFFの言語はSCR-001セレクタ・AIF-003の切替先から除外 | Persona.languages |
| GreetingTabs | 言語別挨拶文。[AIで生成]→トーン+製品情報から各言語分を生成 | Persona.greeting |
| SaveButton | PATCH /api/ai-employees/:id/persona | Persona |

## States
- loading: 取得中スケルトン
- error: 保存失敗トースト「保存できませんでした [再試行]」
- success: 保存トースト「保存しました」

## Interactions
- 各項目変更 → プレビュー即時反映 → [保存]で永続化
- 保存後、SCR-002の新規セッションに反映される

## AI Behaviors
- [AIで生成](挨拶文): トーン・製品名から4言語の挨拶を生成。fallback: デフォルトテンプレート文を挿入
