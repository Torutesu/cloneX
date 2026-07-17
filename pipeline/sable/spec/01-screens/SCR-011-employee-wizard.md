# SCR-011: AI社員一覧+作成ウィザード
- route: /app(一覧)、/app/new(ウィザード)
- auth: authenticated
- purpose: AI社員の一覧と、URL 1本からのゼロタッチ立ち上げ(F2の入口)

## Layout
```
/app:
+--sidebar--+---------------------------------------+
| AI社員一覧 | [+ AI社員を作成]                       |
|           | +----------------+ +----------------+ |
|           | | [アバター] Sana | | ...            | |
|           | | TaskFlow       | |                | |
|           | | ● PUBLISHED    | |                | |
|           | | Brain: READY   | |                | |
|           | +----------------+ +----------------+ |
+-----------+---------------------------------------+

/app/new(3ステップウィザード):
Step1 製品情報: [製品名] [製品URL] [AI社員の表示名]
Step2 Brain構築: 「URLから自動で学習します」[構築開始] → 進捗表示 → 生成結果プレビュー(ナレッジn件・シナリオ1本)
Step3 完了: 「リハーサルで確認 → 公開しましょう」[ペルソナ設定へ] [デモ設定へ]
```

## Components
| Component | Behavior | Data |
|---|---|---|
| EmployeeCard | アバター+名前+製品名+status/brainStatusバッジ。クリック→SCR-018(その社員のセッション一覧をホームとする)[ASSUMED] | AiEmployee, Persona |
| WizardStep1 | 製品名・URL・表示名を入力 → POST /api/ai-employees(slugは自動生成) | AiEmployee |
| WizardStep2 | [構築開始] → POST /api/ai-employees/:id/build-brain(AIF-001)。brainStatus=BUILDINGの間はポーリングで進捗表示。完了後、生成されたKnowledgeNode件数とシナリオステップ数を表示 | Source, KnowledgeNode, DemoScenario |
| WizardStep3 | SCR-015 / SCR-014 への導線ボタン | - |

## States
- loading: 一覧取得中スケルトン
- empty: AI社員0件 →「最初のAI社員を作成しましょう」+[+作成]の空状態
- error: Brain構築失敗(brainStatus=FAILED)→「構築に失敗しました [再試行] または手動でソースを追加してください(SCR-012へ)」(AIF-001 fallback)
- success: 一覧/ウィザード表示

## Interactions
- [+ AI社員を作成] → /app/new
- Step2完了 → Step3 → [ペルソナ設定へ](SCR-015)
- サイドバー: 選択中AI社員配下に Brain(SCR-012/013)/ デモ(SCR-014)/ ペルソナ(SCR-015)/ 配備(SCR-017)/ セッション(SCR-018)/ インサイト(SCR-020)

## AI Behaviors
- AIF-001(製品URLクロール→ナレッジ+デモシナリオ+挨拶文の自動生成)
