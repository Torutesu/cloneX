# API: Sable clone

- 認証: セッションCookie(管理者)。`/api/public/*` は認証不要(sessionId/slugが実質的なアクセス権)
- エラーは `{error: string}` + 適切なHTTPステータス。Zodでリクエスト検証

## 管理者API

| Method | Path | Auth | Request | Response | Screen |
|---|---|---|---|---|---|
| POST | /api/auth/signup | public | {name, email, password} | {user} + Set-Cookie | SCR-010 |
| POST | /api/auth/signin | public | {email, password} | {user} + Set-Cookie | SCR-010 |
| POST | /api/auth/signout | authenticated | - | 204 | 全画面 |
| GET | /api/ai-employees | authenticated | - | {employees: [{...AiEmployee, persona}]} | SCR-011 |
| POST | /api/ai-employees | authenticated | {name, productName, productUrl} | {employee}(slug自動生成、Persona/デフォルト値も同時作成) | SCR-011 |
| GET | /api/ai-employees/:id | authenticated | - | {employee, persona, counts}(brainStatusポーリング兼用) | SCR-011〜020 |
| PATCH | /api/ai-employees/:id | authenticated | {status?} | {employee}(brainStatus≠READYでPUBLISHED化は400) | SCR-017 |
| POST | /api/ai-employees/:id/build-brain | authenticated | - | 202 {brainStatus:"BUILDING"}(AIF-001非同期実行) | SCR-011 |
| PATCH | /api/ai-employees/:id/persona | authenticated | {displayName?, avatarPreset?, accentColor?, tone?, languages?, greeting?} | {persona} | SCR-015 |
| GET | /api/ai-employees/:id/sources | authenticated | - | {sources} | SCR-012 |
| POST | /api/ai-employees/:id/sources | authenticated | {type, name, content?, url?} | {source}(AIF-001増分処理を非同期起動) | SCR-012 |
| DELETE | /api/sources/:id | authenticated | - | 204(由来ノードはsourceId=null) | SCR-012 |
| POST | /api/sources/:id/reprocess | authenticated | - | 202 | SCR-012 |
| GET | /api/ai-employees/:id/knowledge | authenticated | ?kind=&q= | {nodes} | SCR-013 |
| POST | /api/ai-employees/:id/knowledge | authenticated | {kind, title, body} | {node}(isEdited=true) | SCR-013 |
| PATCH | /api/knowledge/:id | authenticated | {kind?, title?, body?} | {node}(isEdited=true) | SCR-013 |
| DELETE | /api/knowledge/:id | authenticated | - | 204 | SCR-013 |
| GET | /api/ai-employees/:id/gaps | authenticated | ?status= | {gaps} | SCR-013, SCR-020 |
| POST | /api/gaps/:id/resolve | authenticated | {title, body}(kind=FAQでノード作成) | {gap, node} | SCR-013 |
| GET | /api/ai-employees/:id/scenario | authenticated | - | {scenario, steps} | SCR-014 |
| POST | /api/scenarios/:id/steps | authenticated | {title, route, selector?, narration} | {step}(order=末尾) | SCR-014 |
| PATCH | /api/steps/:id | authenticated | {title?, route?, selector?, narration?} | {step} | SCR-014 |
| DELETE | /api/steps/:id | authenticated | - | 204(order詰め直し) | SCR-014 |
| POST | /api/scenarios/:id/reorder | authenticated | {stepIds: [順序どおり]} | {steps} | SCR-014 |
| GET | /api/ai-employees/:id/sessions | authenticated | ?status=&language=&includeRehearsal= | {sessions}(既定でREHEARSAL除外) | SCR-018 |
| GET | /api/sessions/:id | authenticated | - | {session, turns, events, qualification} | SCR-019 |
| GET | /api/ai-employees/:id/insights | authenticated | - | {report?, stats: {sessionCount, avgDurationSec, questionCount, openGapCount}}(reportは最新のInsightReport、statsはDB直接集計) | SCR-020 |
| POST | /api/ai-employees/:id/insights | authenticated | - | {report}(AIF-006同期実行)| SCR-020 |

## AIユーティリティAPI(管理画面の生成ボタン)

| Method | Path | Auth | Request | Response | Screen |
|---|---|---|---|---|---|
| POST | /api/ai/greeting | authenticated | {aiEmployeeId} | {greeting: {ja,en,zh,es}}(AIF-001の部分機能) | SCR-015 |
| POST | /api/ai/translate-narration | authenticated | {stepId, targetLang} | {narration}(AIF-003の翻訳基盤) | SCR-014 |
| POST | /api/ai/draft-answer | authenticated | {gapId} | {title, body}(AIF-006の部分機能) | SCR-013 |

## 公開API(買い手向け)

| Method | Path | Auth | Request | Response | Screen |
|---|---|---|---|---|---|
| GET | /api/public/employees/:slug | public | - | {productName, persona(表示用), languages}(DRAFTは404) | SCR-001 |
| POST | /api/public/sessions | public | {slug, buyerName?, buyerCompany?, language, mode?}(mode=REHEARSALは要認証Cookie) | {session, greetingTurn}(挨拶ターンを自動生成) | SCR-001, SCR-017 |
| GET | /api/public/sessions/:id | public | - | {session, persona, steps(表示用), turns, events}(ポーリング兼用) | SCR-002, SCR-003 |
| POST | /api/public/sessions/:id/messages | public | {text} | {aiTurn, directives: {stepOrder?, language?, gapRecorded?}}(AIF-002/003/004) | SCR-002 |
| POST | /api/public/sessions/:id/step | public | {order} | {session, narrationTurn}(STEP_SHOWN記録+該当narrationのAIターン生成) | SCR-002 |
| POST | /api/public/sessions/:id/end | public | - | {session, summary, qualification}(AIF-005実行、status=ENDED) | SCR-002→003 |

## 備考

- ENDEDセッションへのmessages/step/endは409
- `POST /messages` のdirectivesはクライアント側の演出指示(ステージ遷移・言語切替・⚠表示)に使う。DB状態(Session.language等)はサーバ側で更新済み
- AI呼び出しは全て単一クライアント経由。`AI_MODE=fixture`(既定)で決定的固定応答、`AI_MODE=live` + ANTHROPIC_API_KEY で実LLM(05-ai-features.md)
