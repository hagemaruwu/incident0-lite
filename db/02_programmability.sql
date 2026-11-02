-- ============================================================================
-- INCIDENTZERO LITE: 02_programmability.sql
-- Advanced Database Features: Indexing, Stored Procedures, Triggers, Views
-- Satisfies Syllabus Rubric Section 7 (>= 4 Advanced DB Features)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INDEXING: pgvector HNSW Proximity Graph Index
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_error_logs_embedding_hnsw;
CREATE INDEX idx_error_logs_embedding_hnsw 
ON error_logs USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ----------------------------------------------------------------------------
-- 2. VECTOR SEARCH FUNCTION: Semantic Post-Mortem Correlation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_find_similar(
    p_query_embedding VECTOR(768),
    p_limit INT DEFAULT 3
)
RETURNS TABLE (
    incident_id INT,
    incident_number VARCHAR(20),
    title VARCHAR(255),
    severity VARCHAR(10),
    category VARCHAR(50),
    summary TEXT,
    similarity NUMERIC(5,4)
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        i.incident_id,
        i.incident_number,
        i.title,
        i.severity,
        rc.category,
        rc.summary,
        ROUND((1 - (el.embedding <=> p_query_embedding))::NUMERIC, 4) AS similarity
    FROM error_logs el
    JOIN incidents i ON el.incident_id = i.incident_id
    JOIN root_causes rc ON i.incident_id = rc.incident_id
    ORDER BY el.embedding <=> p_query_embedding ASC
    LIMIT p_limit;
$$;

-- ----------------------------------------------------------------------------
-- 3. STORED PROCEDURE: Atomic Incident Ingestion & Service Degradation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sp_create_incident(
    p_title VARCHAR(255),
    p_description TEXT,
    p_severity VARCHAR(10),
    p_service_id INT,
    p_assigned_to INT,
    p_message TEXT,
    p_stack_trace TEXT,
    p_embedding VECTOR(768)
)
RETURNS TABLE (
    created_incident_id INT,
    created_incident_number VARCHAR(20),
    service_status_updated VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_inc_id INT;
    v_inc_num VARCHAR(20);
    v_service_status VARCHAR(20);
BEGIN
    -- 1. Generate human-readable incident number from sequence
    v_inc_id := nextval(pg_get_serial_sequence('incidents', 'incident_id'));
    v_inc_num := FORMAT('INC-%s-%s', EXTRACT(YEAR FROM NOW())::INT, LPAD(v_inc_id::TEXT, 4, '0'));

    -- 2. Insert into incidents
    INSERT INTO incidents (
        incident_id, incident_number, title, description, severity, status, service_id, assigned_to
    ) VALUES (
        v_inc_id, v_inc_num, p_title, p_description, p_severity, 'OPEN', p_service_id, p_assigned_to
    );

    -- 3. Insert telemetry log with 768-d vector embedding
    INSERT INTO error_logs (
        incident_id, log_level, message, stack_trace, embedding
    ) VALUES (
        v_inc_id, 'ERROR', p_message, p_stack_trace, p_embedding
    );

    -- 4. Cascade service status degradation based on incident severity
    IF p_severity = 'P1' THEN
        UPDATE services SET status = 'OUTAGE' WHERE service_id = p_service_id;
        v_service_status := 'OUTAGE';
    ELSIF p_severity = 'P2' THEN
        UPDATE services SET status = 'DEGRADED' WHERE service_id = p_service_id AND status = 'OPERATIONAL';
        SELECT status INTO v_service_status FROM services WHERE service_id = p_service_id;
    ELSE
        SELECT status INTO v_service_status FROM services WHERE service_id = p_service_id;
    END IF;

    RETURN QUERY SELECT v_inc_id, v_inc_num, v_service_status;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. TRIGGER A (BEFORE): Automated Timestamps Management
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_incident_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();

    IF (NEW.status IN ('RESOLVED', 'CLOSED')) THEN
        IF (OLD.resolved_at IS NULL) THEN
            NEW.resolved_at := NOW();
        END IF;
    ELSIF (NEW.status IN ('OPEN', 'INVESTIGATING')) THEN
        NEW.resolved_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_timestamps ON incidents;
CREATE TRIGGER trg_incident_timestamps
BEFORE INSERT OR UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION fn_trg_incident_timestamps();

-- ----------------------------------------------------------------------------
-- 5. TRIGGER B (AFTER): Audit Trail State History Logging
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_incident_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO incident_status_history (incident_id, previous_status, new_status, changed_by, changed_at)
        VALUES (NEW.incident_id, NULL, NEW.status, NEW.assigned_to, NOW());
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO incident_status_history (incident_id, previous_status, new_status, changed_by, changed_at)
        VALUES (NEW.incident_id, OLD.status, NEW.status, NEW.assigned_to, NOW());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_status_history ON incidents;
CREATE TRIGGER trg_incident_status_history
AFTER INSERT OR UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION fn_trg_incident_status_history();

-- ----------------------------------------------------------------------------
-- 6. RELATIONAL VIEW: Service Reliability & MTTR Aggregation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_incident_summary AS
SELECT 
    s.service_id,
    s.service_name,
    s.tier,
    s.status AS current_status,
    COUNT(i.incident_id) AS total_incidents,
    COUNT(i.incident_id) FILTER (WHERE i.severity IN ('P1', 'P2')) AS critical_incidents,
    COUNT(i.incident_id) FILTER (WHERE i.status IN ('OPEN', 'INVESTIGATING')) AS active_incidents,
    ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.declared_at)) / 60.0) FILTER (WHERE i.resolved_at IS NOT NULL), 0)::NUMERIC, 1) AS avg_mttr_minutes
FROM services s
LEFT JOIN incidents i ON s.service_id = i.service_id
GROUP BY s.service_id, s.service_name, s.tier, s.status;
