# API: cloneX (Octolane clone)

- version: 1
- 認証: セッションCookie(Web UI)。`/api/mcp` のみ `Authorization: Bearer <ApiToken平文>`
- 全エンドポイントはワークスペース境界を強制(セッションユーザーの所属ワークスペース外のリソースは404)
- エラー形式: `{ error: { code: string, message: string } }`、バリデーションは400

| Method | Path | Auth | Request | Response | Screen |
|---|---|---|---|---|---|
| POST | /api/auth/signup | public | {email, password, name} | {user} +Set-Cookie | SCR-001 |
| POST | /api/auth/login | public | {email, password} | {user} +Set-Cookie | SCR-001 |
| POST | /api/auth/logout | authenticated | - | 204 | 共通sidebar |
| GET | /api/me | authenticated | - | {user, workspace?} | 全画面(ガード) |
| POST | /api/workspaces | authenticated | {name} | {workspace}(デフォルトPipeline+Stage6種を同時生成) | SCR-002 |
| GET | /api/companies | authenticated | ?q= | {companies: [{...,contactCount,dealCount}]} | SCR-008 |
| POST | /api/companies | authenticated | {name, domain?} | {company} / 409 domain重複 | SCR-008 |
| GET | /api/companies/:id | authenticated | - | {company, contacts, deals} | SCR-008 |
| PATCH | /api/companies/:id | authenticated | {name?, domain?} | {company} | SCR-008 |
| GET | /api/contacts | authenticated | ?q= | {contacts: [{...,company,dealCount}]} | SCR-007 |
| POST | /api/contacts | authenticated | {name, email, title?, companyId? \| companyName?} | {contact} / 409 email重複 | SCR-007 |
| GET | /api/contacts/:id | authenticated | - | {contact, company, deals, activities} | SCR-007 |
| PATCH | /api/contacts/:id | authenticated | {name?, email?, title?, companyId?} | {contact} | SCR-007 |
| GET | /api/deals | authenticated | ?view=board | board時: {stages: [{stage, deals[], totalAmount}]} | SCR-003, SCR-005 |
| POST | /api/deals | authenticated | {name, stageId?, amount?, companyId?, contactIds?} | {deal}(stageId省略時は先頭ステージ) | SCR-005 |
| GET | /api/deals/:id | authenticated | - | {deal, stage, company, contacts, activities, tasks, notes, pendingProposalCount} | SCR-006 |
| PATCH | /api/deals/:id | authenticated | {name?, stageId?, amount?, nextActionAt?} | {deal}(変更内容をActivity(SYSTEM)に記録) | SCR-005, SCR-006 |
| GET | /api/tasks | authenticated | ?status=OPEN\|DONE&dueBefore= | {tasks: [{...,deal}]} | SCR-003, SCR-013 |
| POST | /api/tasks | authenticated | {title, dueAt?, dealId?} | {task} | SCR-013 |
| PATCH | /api/tasks/:id | authenticated | {status?, title?, dueAt?} | {task}(DONE化はActivity(TASK)記録) | SCR-003, SCR-006, SCR-013 |
| POST | /api/notes | authenticated | {dealId, body} | {note}(Activity(NOTE)同時記録) | SCR-006 |
| GET | /api/activities | authenticated | ?dealId= / ?limit=10 | {activities} | SCR-003, SCR-006 |
| GET | /api/proposals | authenticated | ?status=&type=&count=true | {proposals} or {count} | SCR-003, SCR-010, 共通sidebar |
| POST | /api/proposals | authenticated | {type: "DRAFT_EMAIL", payload, sourceType: "CHAT", sourceId, confidence} | {proposal}(SCR-004のDraftPreviewCard[承認キューに入れる]用) | SCR-004 |
| POST | /api/proposals/:id/approve | authenticated | {payload?}(編集して承認時のみ) | {proposal, created: {dealId?, contactId?, taskId?}}(実体化ルールはSCR-010) | SCR-003, SCR-010 |
| POST | /api/proposals/:id/reject | authenticated | - | {proposal} | SCR-003, SCR-010 |
| POST | /api/integrations/mailbox/connect | authenticated | - | {status: "connected"} | SCR-002 |
| POST | /api/integrations/mailbox/sync | authenticated | - | {jobId}(fixtures/emails/ の未取込メールを取込→AIF-001実行) | SCR-002, SCR-015 |
| GET | /api/integrations/mailbox/status | authenticated | ?jobId= | {state: running\|done, ingested, proposalsCreated} | SCR-002, SCR-015 |
| POST | /api/ingest/email | authenticated | {fromEmail, fromName?, subject, bodyText, sentAt?} | {messageId, proposals: [...]}(同期的にAIF-001実行) | SCR-015(E2E-013でも使用) |
| GET | /api/chat/messages | authenticated | - | {messages} | SCR-004 |
| POST | /api/chat | authenticated | {content} | {userMessage, assistantMessage}(AIF-002/003。toolCalls込み) | SCR-004 |
| GET | /api/settings/auto-approve | authenticated | - | {policies: ProposalType別} | SCR-015 |
| PUT | /api/settings/auto-approve | authenticated | {policies: [{proposalType, enabled, threshold}]} | {policies} | SCR-015 |
| GET | /api/tokens | authenticated | - | {tokens(hashは返さない)} | SCR-015 |
| POST | /api/tokens | authenticated | {name} | {token: 平文(この1回のみ), record} | SCR-015 |
| DELETE | /api/tokens/:id | authenticated | - | 204 | SCR-015 |
| POST | /api/mcp | Bearer ApiToken | MCP Streamable HTTP | MCPプロトコル準拠 | (画面なし。SCR-015に接続情報表示) |

## MCPツール一覧(/api/mcp)

内部サービス層(実装時 `src/lib/services/*`)をUIのAPIルートと共有すること(teardown 7-1「MCPファースト」)。

| Tool | 説明 | 対応する内部サービス |
|---|---|---|
| deals_search | 名前/ステージ/停滞日数でディール検索 | dealService.search(AIF-002と同一) |
| deals_create / deals_update | ディール作成・更新 | dealService |
| contacts_search / contacts_create | コンタクト検索・作成 | contactService |
| companies_search | 企業検索 | companyService |
| tasks_list / tasks_create / tasks_complete | タスク操作 | taskService |
| proposals_list / proposals_approve / proposals_reject | 承認キュー操作 | proposalService |
| activities_list | タイムライン取得 | activityService |
