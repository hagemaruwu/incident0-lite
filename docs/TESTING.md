# Automated and Empirical Testing Record

> **Course:** Database Management Systems (UE23CS351A), PES University  
> **Project:** IncidentZero Lite — SRE Telemetry & Root-Cause Correlation Engine  
> **Environment:** PostgreSQL 16 + pgvector (`incidentzero_db`), Node.js v22.16.0, Next.js 16.4.3  

---

## 1. Test Execution Summary

All tests recorded below were physically executed against the running database container and local application server.

| Test ID | Area | Input / Action | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **TC-SEC-01** | Credential Security | `grep -rn "password123" src test` | No hard-coded credential fallback in source or tests | Exit code 1 (no occurrences) | **PASS** |
| **TC-SEC-02** | Lazy Env Validation | `env -u DATABASE_URL node --test test/*.test.mjs` | Fails with explicit configuration message | `Error: DATABASE_URL is not set. Copy .env.example to .env.local.` | **PASS** |
| **TC-DB-01** | Schema Integrity | Query `information_schema.tables` for 4 base tables | `incidents`, `services`, `error_logs`, `root_causes` exist | All tables confirmed present | **PASS** |
| **TC-DB-02** | Stored Procedure | Execute `sp_create_incident` with severity `P1` | Inserts telemetry vector, cascades service to `OUTAGE` | 1 record returned, `service_status_updated: 'OUTAGE'` | **PASS** |
| **TC-DB-03** | Vector Similarity | Query `fn_find_similar` with exact embedding | Top match has similarity 1.0000 | Match `INC-2026-0001`, `similarity: 1.0000` | **PASS** |
| **TC-DB-04** | Migration Schema | Query `information_schema.columns` for `users.password_hash` | Column `password_hash` exists on table `users` | 1 column record confirmed | **PASS** |
| **TC-DB-05** | Cryptographic Hash | Verify seeded passwords with `crypt('Demo@123', password_hash)` | All 4 seeded users verify successfully | 4 rows matched | **PASS** |
| **TC-DB-06** | Cryptographic Hash | Verify wrong password with `crypt('WrongPassword', password_hash)` | 0 users match | 0 rows matched | **PASS** |
| **TC-DB-07** | Domain Constraint | Insert incident with invalid severity `P9` | Rejected with PostgreSQL check violation (`23514`) | Error code `23514`, transaction rolled back | **PASS** |
| **TC-DB-08** | Referential Integrity | Delete service referenced by incidents (`DELETE FROM services WHERE service_id = 1`) | Rejected with foreign key violation (`23503`) | Error code `23503`, transaction rolled back | **PASS** |
| **TC-AUTH-01** | Session Auth | POST `/api/auth/login` with invalid password | HTTP 401 Unauthorized | HTTP `401` `{"error":"Invalid email or password"}` | **PASS** |
| **TC-AUTH-02** | Session Auth | POST `/api/auth/login` with `Demo@123` | HTTP 200 OK, sets HTTP-only `session` cookie | HTTP `200` `{"user_id":1,"full_name":"Aditya Raj","role":"ADMIN"}` | **PASS** |
| **TC-AUTH-03** | Session Auth | GET `/api/auth/me` without cookie | HTTP 401 Unauthorized | HTTP `401` `{"error":"Unauthorized"}` | **PASS** |
| **TC-AUTH-04** | Session Auth | GET `/api/auth/me` with session cookie | HTTP 200 OK with session payload | HTTP `200` `{"user_id":1,"role":"ADMIN","full_name":"Aditya Raj"}` | **PASS** |
| **TC-AUTH-05** | Session Auth | POST `/api/auth/logout` | HTTP 200 OK, clears session cookie | HTTP `200` `{"success":true}`, cookie cleared | **PASS** |
| **TC-AUTH-06** | Session Auth | GET `/api/auth/me` after logout | HTTP 401 Unauthorized | HTTP `401` `{"error":"Unauthorized"}` | **PASS** |
| **TC-RBAC-01** | RBAC Unauth | GET `/api/incidents` without session | HTTP 401 Unauthorized | HTTP `401` | **PASS** |
| **TC-RBAC-02** | RBAC Unauth | GET `/api/evaluation` without session | HTTP 401 Unauthorized | HTTP `401` | **PASS** |
| **TC-RBAC-03** | RBAC Unauth | POST `/api/incidents` without session | HTTP 401 Unauthorized | HTTP `401` | **PASS** |
| **TC-RBAC-04** | RBAC Unauth | PATCH `/api/incidents/1` without session | HTTP 401 Unauthorized | HTTP `401` | **PASS** |
| **TC-RBAC-05** | RBAC Unauth | DELETE `/api/incidents/1` without session | HTTP 401 Unauthorized | HTTP `401` | **PASS** |
| **TC-RBAC-06** | RBAC VIEWER | GET `/api/incidents` with VIEWER cookie | HTTP 200 OK | HTTP `200` | **PASS** |
| **TC-RBAC-07** | RBAC VIEWER | GET `/api/evaluation` with VIEWER cookie | HTTP 200 OK | HTTP `200` | **PASS** |
| **TC-RBAC-08** | RBAC VIEWER | POST `/api/incidents` with VIEWER cookie | HTTP 403 Forbidden | HTTP `403` `{"error":"Forbidden"}` | **PASS** |
| **TC-RBAC-09** | RBAC VIEWER | PATCH `/api/incidents/1` with VIEWER cookie | HTTP 403 Forbidden | HTTP `403` `{"error":"Forbidden"}` | **PASS** |
| **TC-RBAC-10** | RBAC VIEWER | DELETE `/api/incidents/1` with VIEWER cookie | HTTP 403 Forbidden | HTTP `403` `{"error":"Forbidden"}` | **PASS** |
| **TC-CRUD-01** | Dynamic Route | POST `/api/incidents` as ENGINEER (P3 `ZZ-TEST-DELETE-ME`) | HTTP 201 Created, sets assigned_to to logged-in user | HTTP `201` `created_incident_id: 16`, assigned_to: `2` | **PASS** |
| **TC-TRIG-01** | DB Trigger History | Query `incident_status_history` after insert | Initial status history row recorded by trigger | 1 row (`previous_status: NULL`, `new_status: OPEN`) | **PASS** |
| **TC-CRUD-02** | Dynamic Route | PATCH `/api/incidents/16` as ENGINEER (`status: INVESTIGATING`) | HTTP 200 OK, updates status | HTTP `200` `status: 'INVESTIGATING'` | **PASS** |
| **TC-TRIG-02** | DB Trigger History | Query `incident_status_history` after status change | Transition recorded by AFTER UPDATE trigger | 2 rows (`OPEN` -> `INVESTIGATING`, `changed_by: 2`) | **PASS** |
| **TC-RBAC-11** | RBAC ENGINEER | DELETE `/api/incidents/16` as ENGINEER | HTTP 403 Forbidden (ADMIN only) | HTTP `403` `{"error":"Forbidden"}` | **PASS** |
| **TC-CASCADE-01**| Cascade Verification| Query child rows before deletion (`incident_id = 16`) | Child rows present in child tables | `incidents: 1, error_logs: 1, history: 2` | **PASS** |
| **TC-CRUD-03** | Dynamic Route | DELETE `/api/incidents/16` as ADMIN | HTTP 200 OK, cascades to child tables | HTTP `200` `{"success":true,"deleted_id":16}` | **PASS** |
| **TC-CASCADE-02**| Cascade Verification| Query child rows after deletion (`incident_id = 16`) | All child records deleted via `ON DELETE CASCADE` | `incidents: 0, error_logs: 0, history: 0` | **PASS** |
| **TC-CRUD-04** | Dynamic Route | DELETE `/api/incidents/16` second time | HTTP 404 Not Found | HTTP `404` `{"error":"Incident not found"}` | **PASS** |
| **TC-VALID-01**| Route Validation | PATCH `/api/incidents/1` with `status: INVALID_STATUS` | HTTP 400 Bad Request | HTTP `400` `{"error":"Invalid status"}` | **PASS** |
| **TC-VALID-02**| Route Validation | PATCH `/api/incidents/notanid` with invalid ID | HTTP 400 Bad Request | HTTP `400` `{"error":"Invalid incident ID"}` | **PASS** |

---

## 2. Test Suite Execution Output

```
> incident0-lite@1.0.0 test
> node --env-file=.env.local --test test/*.test.mjs

▶ IncidentZero Lite: Smoke Test Suite
  ✔ schema tables exist (11.91825ms)
  ✔ sp_create_incident cascades status (7.420875ms)
  ✔ pgvector semantic similarity search (1.703958ms)
  ✔ users.password_hash column exists (9.481125ms)
  ✔ correct password verifies via crypt() (22.090208ms)
  ✔ wrong password does not verify via crypt() (18.184ms)
  ✔ invalid severity is rejected by CHECK constraint (2.109625ms)
  ✔ deleting service with incidents is rejected by FK RESTRICT (1.455ms)
✔ IncidentZero Lite: Smoke Test Suite (105.13325ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 176.84625
```
