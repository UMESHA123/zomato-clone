\connect zomato_health;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS endpoint_registry (
    id SERIAL PRIMARY KEY,
    endpoint_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    component TEXT NOT NULL,
    surface TEXT NOT NULL,
    route_path TEXT NOT NULL,
    target_kind TEXT NOT NULL DEFAULT 'http',
    target_url TEXT,
    method TEXT NOT NULL DEFAULT 'GET',
    expected_status_codes INTEGER[] NOT NULL DEFAULT ARRAY[200],
    execution_mode TEXT NOT NULL DEFAULT 'live',
    requires_auth BOOLEAN NOT NULL DEFAULT FALSE,
    sequence INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    sample_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_check_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending',
    total_checks INTEGER NOT NULL DEFAULT 0,
    completed_checks INTEGER NOT NULL DEFAULT 0,
    healthy_count INTEGER NOT NULL DEFAULT 0,
    unhealthy_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_check_results (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES health_check_runs(id) ON DELETE CASCADE,
    endpoint_id INTEGER NOT NULL REFERENCES endpoint_registry(id) ON DELETE CASCADE,
    endpoint_key TEXT NOT NULL,
    component TEXT NOT NULL,
    surface TEXT NOT NULL,
    status TEXT NOT NULL,
    http_status INTEGER,
    duration_ms INTEGER,
    request_payload JSONB,
    response_payload JSONB,
    response_excerpt TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (run_id, endpoint_id)
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    rule_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    endpoint_pattern TEXT,
    surface_filter TEXT,
    threshold_value NUMERIC NOT NULL DEFAULT 1,
    threshold_unit TEXT NOT NULL DEFAULT 'count',
    consecutive_runs INTEGER NOT NULL DEFAULT 1,
    cooldown_minutes INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS triggered_alerts (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'firing',
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    endpoint_key TEXT,
    endpoint_name TEXT,
    run_id UUID,
    metric_value NUMERIC,
    threshold_value NUMERIC NOT NULL,
    fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_endpoint_registry_surface_component
    ON endpoint_registry(surface, component, sequence);

CREATE INDEX IF NOT EXISTS idx_health_check_results_run_created
    ON health_check_results(run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_check_runs_started
    ON health_check_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_triggered_alerts_state
    ON triggered_alerts(state);

CREATE INDEX IF NOT EXISTS idx_triggered_alerts_fired
    ON triggered_alerts(fired_at DESC);

CREATE INDEX IF NOT EXISTS idx_triggered_alerts_rule
    ON triggered_alerts(rule_id);

-- Seed default alert rules
INSERT INTO alert_rules (name, description, rule_type, severity, threshold_value, threshold_unit, consecutive_runs, cooldown_minutes, surface_filter) VALUES
    ('Service Down', 'Fires when any live service endpoint is unreachable', 'service_down', 'critical', 1, 'count', 1, 5, NULL),
    ('High Latency', 'Fires when any endpoint response time exceeds threshold', 'high_latency', 'warning', 3000, 'ms', 1, 10, NULL),
    ('Consecutive Failures', 'Fires when an endpoint fails multiple consecutive health checks', 'consecutive_failures', 'critical', 3, 'runs', 3, 15, NULL),
    ('Health Rate Drop', 'Fires when overall health rate drops below threshold', 'health_rate_drop', 'warning', 80, 'percent', 1, 10, NULL),
    ('Backend Error Rate Spike', 'Fires when backend service error rate exceeds threshold', 'error_rate_spike', 'critical', 30, 'percent', 1, 10, 'backend'),
    ('Infrastructure Down', 'Fires when any infrastructure component is down', 'service_down', 'critical', 1, 'count', 1, 2, 'infrastructure'),
    ('Frontend Unreachable', 'Fires when any frontend application is not responding', 'service_down', 'warning', 1, 'count', 2, 5, 'frontend')
ON CONFLICT DO NOTHING;
