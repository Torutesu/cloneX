# SCR-010: サインイン/サインアップ(管理者)
- route: /signin(サインアップは /signup)
- auth: public
- purpose: 管理プラットフォームへの認証

## Layout
```
+----------------------------+
|  Sable clone ロゴ           |
|  [メールアドレス        ]   |
|  [パスワード            ]   |
|  [サインイン]               |
|  アカウント未作成? → /signup |
+----------------------------+
```

## Components
| Component | Behavior | Data |
|---|---|---|
| SignInForm | メール+パスワード認証(bcrypt、セッションCookie)[ASSUMED: SSOなし] | User |
| SignUpForm | 名前+メール+パスワード。登録後 /app へ | User |

## States
- error: 認証失敗「メールアドレスまたはパスワードが違います」
- success: /app(SCR-011)へリダイレクト

## Interactions
- サインイン成功 → SCR-011
- 認証済みで /signin アクセス → SCR-011へリダイレクト

## AI Behaviors
- none
