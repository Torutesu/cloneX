# SCR-001: サインアップ / ログイン
- route: /login(ログイン)、/signup(サインアップ)
- auth: public
- purpose: メール+パスワードで認証する(teardownはGoogle OAuth中心だが、E2E決定性のためMVPはメール+パスワード。[ASSUMED: Change方針])

## Layout
中央カード1枚。ロゴ、タイトル、フォーム、切替リンク。

```
+----------------------------------+
|            cloneX                |
|  [メール入力            ]        |
|  [パスワード入力        ]        |
|  (signupのみ: [名前入力])        |
|  [ ログイン / アカウント作成 ]    |
|  切替リンク(login <-> signup)   |
+----------------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| EmailInput | type=email、必須、形式バリデーション | - |
| PasswordInput | 必須、8文字以上 | - |
| NameInput(signupのみ) | 必須 | - |
| SubmitButton | POST /api/auth/signup or /api/auth/login | User |
| SwitchLink | /login <-> /signup 遷移 | - |

## States
- loading: ボタンをスピナー+disabledに
- error: フォーム上部に赤帯(「メールまたはパスワードが違います」/「このメールは登録済みです」)
- success: サインアップ→SCR-002へ、ログイン→SCR-003へリダイレクト

## Interactions
- サインアップ成功 → セッションCookie発行 → SCR-002(オンボーディング)
- ログイン成功 → SCR-003(ダッシュボード)
- 認証済みユーザーが/loginに来た場合 → SCR-003へリダイレクト

## AI Behaviors
- none
