-- ============================================================================
-- INCIDENTZERO LITE: 03_seeds.sql
-- Seed Data: Core Users, Microservices, Past Incidents & 768-d Vectors
-- ============================================================================

-- 1. SEED USERS (Satisfies RBAC requirement with 3 roles)
INSERT INTO users (user_id, full_name, email, role, department) VALUES
(1, 'Aditya Raj', 'aditya.raj@incidentzero.internal', 'ADMIN', 'Core SRE'),
(2, 'Alakh Gupta', 'alakh.gupta@incidentzero.internal', 'ENGINEER', 'Backend Platforms'),
(3, 'Priya Sharma', 'priya.sharma@incidentzero.internal', 'ENGINEER', 'Database Reliability'),
(4, 'Security Auditor', 'auditor@incidentzero.internal', 'VIEWER', 'Compliance & SecOps')
ON CONFLICT (user_id) DO NOTHING;

-- 2. SEED SERVICES
INSERT INTO services (service_id, service_name, tier, owner_team, status) VALUES
(1, 'auth-service', 'TIER_0', 'Identity & Security', 'OPERATIONAL'),
(2, 'payment-gateway', 'TIER_0', 'FinTech Services', 'OPERATIONAL'),
(3, 'order-processor', 'TIER_1', 'Checkout Logistics', 'OPERATIONAL')
ON CONFLICT (service_id) DO NOTHING;

-- 3. SEED HISTORICAL INCIDENTS
INSERT INTO incidents (incident_id, incident_number, title, description, severity, status, service_id, assigned_to, declared_at, resolved_at) VALUES
(
    1, 'INC-2026-0001',
    'PostgreSQL Connection Pool Exhaustion under Peak Traffic',
    'Client threads blocked waiting for free database connections from connection pool.',
    'P1', 'RESOLVED', 1, 1,
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '45 minutes'
),
(
    2, 'INC-2026-0002',
    'Stripe Webhook Signature Verification Timeout',
    'Payment callback verification failed with signature verification timeout error.',
    'P2', 'RESOLVED', 2, 2,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '28 minutes'
),
(
    3, 'INC-2026-0003',
    'Order Checkout Transaction Deadlock on Concurrent Purchases',
    'Simultaneous order reservations triggered 40P01 deadlock detected on orders table.',
    'P1', 'RESOLVED', 3, 2,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '52 minutes'
),
(
    4, 'INC-2026-0004',
    'Token Refresh Latency Degradation in Auth Gateway',
    'Token renewal latency degraded from 15ms to 850ms causing intermittent timeouts.',
    'P3', 'OPEN', 1, 1,
    NOW() - INTERVAL '2 hours', NULL
)
ON CONFLICT (incident_id) DO NOTHING;

-- 4. SEED ROOT CAUSES (1:1 with resolved incidents)
INSERT INTO root_causes (incident_id, category, summary, resolution_notes, resolved_by, resolved_at) VALUES
(
    1, 'DATABASE_ISSUE',
    'Connection pool client release leak in HTTP error middleware.',
    'Added try/finally client release block in middleware and increased max_connections to 150.',
    1, NOW() - INTERVAL '7 days' + INTERVAL '45 minutes'
),
(
    2, 'NETWORK_TIMEOUT',
    'Upstream ingress proxy dropped raw webhook payload before HMAC verification.',
    'Configured ingress to preserve raw binary payload for Stripe webhook HMAC verification.',
    2, NOW() - INTERVAL '5 days' + INTERVAL '28 minutes'
),
(
    3, 'DATABASE_ISSUE',
    'Unordered table row lock acquisitions during concurrent checkout transactions.',
    'Ordered inventory item IDs before SELECT FOR UPDATE lock acquisition in checkout pipeline.',
    2, NOW() - INTERVAL '2 days' + INTERVAL '52 minutes'
)
ON CONFLICT (incident_id) DO NOTHING;

-- 5. SEED ERROR LOGS WITH 768-DIMENSIONAL UNIT VECTORS
INSERT INTO error_logs (incident_id, log_level, message, stack_trace, embedding) VALUES
(
    1, 'FATAL',
    'TimeoutError: ResourcePool timed out acquiring connection from client pool',
    'at Pool.acquire (/node_modules/pg-pool/index.js:312)\nat AuthContext.getDbClient (/src/db.ts:45)',
    (SELECT ('[' || string_agg(CASE WHEN i BETWEEN 1 AND 10 THEN '0.316' ELSE '0.001' END, ',') || ']')::vector(768) FROM generate_series(1, 768) i)
),
(
    2, 'ERROR',
    'WebhookSignatureVerificationFailed: Signature did not match expected HMAC digest',
    'at Webhook.constructEvent (/node_modules/stripe/lib/Webhooks.js:65)\nat PaymentCallback (/src/routes/webhook.ts:28)',
    (SELECT ('[' || string_agg(CASE WHEN i BETWEEN 20 AND 30 THEN '0.316' ELSE '0.001' END, ',') || ']')::vector(768) FROM generate_series(1, 768) i)
),
(
    3, 'FATAL',
    'DeadlockDetectedError: Process 41221 detected deadlock with transaction 41228 while updating orders',
    'at Query.parse (/node_modules/pg/lib/query.js:142)\nat OrderService.checkout (/src/orders.ts:88)',
    (SELECT ('[' || string_agg(CASE WHEN i BETWEEN 40 AND 50 THEN '0.316' ELSE '0.001' END, ',') || ']')::vector(768) FROM generate_series(1, 768) i)
),
(
    4, 'WARN',
    'SlowQueryWarning: Token validation query exceeded SLA threshold (850ms)',
    'at TokenManager.validate (/src/tokens.ts:62)',
    (SELECT ('[' || string_agg(CASE WHEN i BETWEEN 1 AND 10 THEN '0.250' ELSE '0.005' END, ',') || ']')::vector(768) FROM generate_series(1, 768) i)
);

-- 6. SYNCHRONIZE SERIAL SEQUENCE
SELECT setval(
    pg_get_serial_sequence('incidents', 'incident_id'),
    COALESCE((SELECT MAX(incident_id) FROM incidents), 1),
    true
);
