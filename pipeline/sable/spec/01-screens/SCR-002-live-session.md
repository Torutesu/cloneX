# SCR-002: ライブデモセッション ★コア
- route: /d/[slug]/s/[sessionId](クエリ `?mode=rehearsal` で管理者リハーサル。SCR-017から起動)
- auth: public(sessionId所持がアクセス権)[ASSUMED: 追加トークンなし。MVPの簡略化]
- purpose: AI社員が共有デモステージ上で製品を操作・ナレーションしながら、買い手の質問にリアルタイム応答する。本プロダクトのコア体験

## Layout
```
+----------------------------------+---------------+
|  デモステージ(iframe)            | [アバター]     |
|  +----------------------------+  |  Sana ● 話し中 |
|  | サンプル製品 or 埋込URL      |  +---------------+
|  |   ← AIカーソル(アニメ移動)  |  | トランスクリプト|
|  |   ← ハイライト枠            |  | [AI] こんにちは…|
|  +----------------------------+  | [買い手] 料金は?|
|  [◀ 前へ] ステップ 2/4 [次へ ▶]  | [AI] 料金は…    |
+----------------------------------+---------------+
| [🎤] [メッセージを入力...        ] [送信] [終了]   |
+----------------------------------+---------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| DemoStage | iframeで現在のDemoStep.routeを表示。AIカーソル(擬似カーソルSVG)がstep.selectorの要素位置へ600msでアニメ移動し、ハイライト枠を描画。selector未指定なら全景表示 | DemoStep |
| StepControls | 前へ/次へでステップ移動(買い手も操作可=co-browsing簡易版)。移動時 POST /api/public/sessions/:id/step | Session.currentStepOrder |
| AvatarPanel | 状態連動アニメーション: idle(瞬き)/ thinking(揺れ+「…」)/ speaking(口パク+波形)。accentColor反映 [USER-REQ: 簡易アバター] | Persona |
| SpeakingIndicator | AI応答表示中は「● 話し中」+ Web Speech API(speechSynthesis)でTTS再生。E2E/テスト時は `NEXT_PUBLIC_TTS=off` で無音 [ASSUMED: 音声はブラウザ内蔵APIで代替] | - |
| TranscriptPane | TranscriptTurn時系列。AIターンには参照ナレッジ数を「📚 2件参照」と表示(meta)。言語切替イベントは区切り線「— English に切替 —」 | TranscriptTurn, SessionEvent |
| ChatInput | Enter送信 → POST /api/public/sessions/:id/messages。🎤ボタンはWeb Speech API(SpeechRecognition)で音声入力(対応ブラウザのみ表示) | - |
| LanguageBadge | 現在言語を右上に表示(例: 🌐 日本語)。クリックで手動切替も可能 [USER-REQ: 多言語即時切替] | Session.language |
| EndButton | [終了] → 確認ダイアログ → POST /api/public/sessions/:id/end → SCR-003 | - |
| RehearsalBanner | mode=rehearsal時、上部に「リハーサルモード(記録はインサイトに含まれません)」 | Session.mode |

## States
- loading: セッション取得中はアバター+「準備中…」
- empty: 会話0件時、AIの挨拶(Persona.greeting[language])が自動で最初のターンとして表示され、TTS再生
- error: AI応答失敗 → トランスクリプトに「応答を生成できませんでした [再試行]」(AIF-002 fallback)。iframe読込失敗 → ステージに「デモ画面を表示できません」+ナレーションは継続
- success: 通常表示

## Interactions
- セッション開始 → AIが挨拶+「デモを始めますか?それとも質問からにしますか?」(AIF-004)
- [次へ ▶] or AIの判断でステップ前進 → DemoStageが該当routeへ遷移、カーソル移動、AIがnarration[現在言語]を発話、STEP_SHOWNイベント記録
- 買い手が質問送信 → AIF-002がBrainを検索して回答(現在のステップに関連するステップがあれば「実際にお見せしますね」とジャンプ提案: AIF-004)
- 買い手が別言語で入力(例: 日本語セッション中に "How much is it?")→ AIF-003が検知し、以後の応答・narration・UI文言をその言語へ即時切替。LANGUAGE_SWITCHイベント記録 [USER-REQ]
- LanguageBadgeから手動切替 → 同上
- Brainで答えられない質問 → AIは正直に「持ち帰って確認します」と回答し、GAP_RECORDEDイベント+KnowledgeGap作成(AIF-002)
- [終了] → AIF-005が要約+資格確認を生成 → SCR-003

## AI Behaviors
- AIF-002(Brain参照のリアルタイムQ&A+ギャップ記録)
- AIF-003(言語自動検知→応答言語の即時切替)[USER-REQ]
- AIF-004(デモ進行エージェント: ステップ前進判断・質問関連ステップへのジャンプ)
- 全AI応答はTranscriptTurn.metaに参照ノードIDを記録(透明性)
