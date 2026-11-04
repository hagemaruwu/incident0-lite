# IncidentZero Lite: SRE Telemetry & Root-Cause Correlation Engine

> **DBMS Experiential Learning — Level 3 Capstone Project**  
> **Course:** Database Management Systems (UE23CS351A), Department of CSE, PES University  
> **Faculty Guide:** Dr. Nagasundari S  
> **Team:**  
> - **Aditya Raj** (PES2UG24CS033) — Database Core Architecture, Stored Procedures & REST API  
> - **Alakh Gupta** (PES2UG24CS051) — Database Triggers, pgvector HNSW Indexing, Relational Views & UI  

---

## 1. System Overview

IncidentZero Lite is an enterprise Site Reliability Engineering (SRE) incident response platform that unifies relational transactional storage with high-dimensional vector similarity search in a single **PostgreSQL 16 + pgvector** engine.

```
                           ┌───────────────────────────────┐
                           │   Next.js 16 Web Interface   │
                           │  (War Room, Evaluation Lab)   │
                           └───────────────┬───────────────┘
                                           │ Parameterized SQL ($1..$n)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PostgreSQL 16 with pgvector                               │
│                                                                                        │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────┐  │
│  │   6 Relational Tables   │  │    Stored Procedures      │  │  pgvector Extension  │  │
│  │  (Strict 3NF, Domain    │  │  (Atomic sp_create_       │  │  (768-d HNSW Index:  │  │
│  │   CHECKs, Foreign Keys) │  │   incident with cascade)  │  │   m=16, ef_build=64) │  │
│  └───────────┬─────────────┘  └─────────────┬─────────────┘  └──────────┬───────────┘  │
│              │                              │                           │              │
│              ▼                              ▼                           ▼              │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────┐  │
│  │  BEFORE/AFTER Triggers  │  │   5 Rubric SQL Queries    │  │   Relational View    │  │
│  │  (Timestamps & History) │  │  (JOIN, GROUP, Subquery)  │  │  (vw_incident_summary│  │
│  └─────────────────────────┘  └───────────────────────────┘  └──────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Relational Schema (6 Tables in 3NF)

| Table | Primary Key | Description |
|---|---|---|
| `users` | `user_id SERIAL` | SRE engineers with RBAC constraint: `CHECK (role IN ('ADMIN', 'ENGINEER', 'VIEWER'))` |
| `services` | `service_id SERIAL` | Microservice catalog with operational tiers (`TIER_0` to `TIER_2`) and status |
| `incidents` | `incident_id SERIAL` | Central incident records with lifecycle status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`) |
| `error_logs` | `log_id BIGSERIAL` | Telemetry logs holding error messages, stack traces, and 768-d vectors: `VECTOR(768)` |
| `root_causes` | `root_cause_id SERIAL` | 1:1 post-mortem resolutions with failure categories and remediation notes |
| `incident_status_history` | `history_id BIGSERIAL` | Append-only status transition audit trail automatically populated by database triggers |

---

## 3. Advanced Database Features (Rubric Section 7)

1. **pgvector HNSW Proximity Graph Index (`idx_error_logs_embedding_hnsw`)**:
   - Indexes 768-dimensional error embeddings using Hierarchical Navigable Small World graphs (`m=16, ef_construction=64, vector_cosine_ops`) for sub-linear cosine distance search.
2. **Semantic Post-Mortem Correlation Function (`fn_find_similar`)**:
   - Uses the `<=>` cosine distance operator to retrieve top-k correlated historical post-mortems matching new error signatures.
3. **Atomic Incident Ingestion Stored Procedure (`sp_create_incident`)**:
   - Atomically creates an incident, allocates sequence numbers, inserts telemetry vectors, and automatically cascades service status to `OUTAGE` (P1) or `DEGRADED` (P2) in a single transaction.
4. **Automated State Machine Triggers (`trg_incident_timestamps` & `trg_incident_status_history`)**:
   - BEFORE trigger automatically stamps `updated_at` and `resolved_at` (clearing timestamps upon reopening).
   - AFTER trigger records state transitions into `incident_status_history`.
5. **Relational Aggregation View (`vw_incident_summary`)**:
   - Pre-aggregates MTTR resolution latency, total incidents, and critical outages per service.

---

## 4. Quickstart & Setup

### 1. Launch PostgreSQL 16 + pgvector
```bash
docker compose up -d
```

### 2. Run Database Migrations & Seeds
```bash
npm run db:setup
```

### 3. Run Automated Smoke Test
```bash
npm test
# ✔ IncidentZero Lite: Smoke Test Suite (105ms, 0 failures)
```

### 4. Start Next.js Development Server
```bash
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 5. Web Interface Routes

- **`/` (Live SRE War Room)**: Executive dashboard with KPI counters, inline incident declaration studio, live debounced vector search against past post-mortems, and active incident queue with severity filters.
- **`/evaluation` (Professor Evaluation Lab)**: Interactive rubric verification suite executing 5 complex database queries (Multi-Table JOINs, GROUP BY with HAVING, Nested Subqueries, Window Functions with `DENSE_RANK`, and pgvector cosine search) with real-time execution plans.
