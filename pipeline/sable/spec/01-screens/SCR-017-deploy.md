# SCR-017: 配備(公開・共有)
- route: /app/[aiId]/deploy
- auth: authenticated
- purpose: 買い手向けリンクの発行・公開状態の管理・リハーサル起動

## Layout
```
+--sidebar--+---------------------------------------+
|           | 公開状態: [● 非公開 ○ 公開]  ←トグル    |
|           |                                       |
|           | 共有リンク:                             |
|           | [https://…/d/taskflow-demo] [コピー]    |
|           |                                       |
|           | 埋込スニペット:                          |
|           | [<script src=…></script>] [コピー]      |
|           |                                       |
|           | [🎧 リハーサルを開始](別タブでSCR-002)   |
+-----------+---------------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| PublishToggle | status DRAFT⇄PUBLISHED切替。brainStatus≠READYなら公開不可(理由ツールチップ) | AiEmployee.status |
| ShareLinkCard | /d/[slug] の絶対URL表示+クリップボードコピー | AiEmployee.slug |
| EmbedSnippet | サイト右下に「デモを見る」ボタンを出す1行スクリプト(ボタン→共有リンクを新規タブで開く簡易版)[ASSUMED: ウィジェット本体は次版] | - |
| RehearsalButton | POST /api/public/sessions(mode=REHEARSAL)→ SCR-002を別タブで開く | Session |

## States
- loading: 取得中スケルトン
- error: 公開切替失敗トースト
- success: 上記表示

## Interactions
- 公開トグルON → SCR-001が有効になる。OFF → SCR-001は「利用できません」表示
- [リハーサルを開始] → SCR-002(rehearsalバナー付き)

## AI Behaviors
- none
