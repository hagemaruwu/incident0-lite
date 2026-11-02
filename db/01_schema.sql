-- ============================================================================
-- INCIDENTZERO LITE: 01_schema.sql
-- Relational Schema: 6 Tables in Strict 3NF
-- DBMS Experiential Learning - Level 3 Capstone
-- Team: Aditya Raj (PES2UG24CS033) & Alakh Gupta (PES2UG24CS051)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Clean slate if re-running
DROP TABLE IF EXISTS root_causes CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS incident_status_history CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- TABLE 1: users (Role-Based Access Control - RBAC)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'ENGINEER', 'VIEWER')),
    department VARCHAR(100) NOT NULL DEFAULT 'Site Reliability Engineering',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: services (Microservice Catalog & Real-Time Status)
CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) UNIQUE NOT NULL,
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('TIER_0', 'TIER_1', 'TIER_2')),
    owner_team VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL' 
        CHECK (status IN ('OPERATIONAL', 'DEGRADED', 'OUTAGE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 3: incidents (Core Incident Lifecycle)
CREATE TABLE incidents (
    incident_id SERIAL PRIMARY KEY,
    incident_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('P1', 'P2', 'P3', 'P4')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
    service_id INT NOT NULL REFERENCES services(service_id) ON DELETE RESTRICT,
    assigned_to INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    declared_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 4: error_logs (Telemetry & High-Dimensional Vectors)
CREATE TABLE error_logs (
    log_id BIGSERIAL PRIMARY KEY,
    incident_id INT NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    log_level VARCHAR(10) NOT NULL CHECK (log_level IN ('INFO', 'WARN', 'ERROR', 'FATAL')),
    message TEXT NOT NULL,
    stack_trace TEXT,
    embedding VECTOR(768) NOT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 5: root_causes (1:1 Post-Mortems & Resolutions)
CREATE TABLE root_causes (
    root_cause_id SERIAL PRIMARY KEY,
    incident_id INT NOT NULL UNIQUE REFERENCES incidents(incident_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'DATABASE_ISSUE', 'NETWORK_TIMEOUT', 'BAD_DEPLOYMENT', 
        'CONFIG_ERROR', 'DEPENDENCY_FAILURE', 'MEMORY_LEAK'
    )),
    summary TEXT NOT NULL,
    resolution_notes TEXT NOT NULL,
    resolved_by INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 6: incident_status_history (Audit Trail Populated by Trigger)
CREATE TABLE incident_status_history (
    history_id BIGSERIAL PRIMARY KEY,
    incident_id INT NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
