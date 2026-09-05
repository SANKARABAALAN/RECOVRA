-- ==========================================
-- CLEAN RESET (Drops tables and triggers if they exist)
-- ==========================================
DROP TRIGGER IF EXISTS update_merchants_updated_at ON merchants;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
DROP TRIGGER IF EXISTS update_recovery_cases_updated_at ON recovery_cases;

DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS recovery_cases CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLE 1: merchants
-- ==========================================
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    business_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLE 2: payments
-- ==========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    order_id TEXT,
    payment_id TEXT UNIQUE,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_method TEXT,
    status TEXT NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLE 3: recovery_cases
-- ==========================================
CREATE TABLE recovery_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    current_stage TEXT NOT NULL,
    recovery_status TEXT NOT NULL,
    confidence_score NUMERIC(5, 2),
    recommended_action TEXT,
    customer_intent TEXT,
    scheduled_retry_at TIMESTAMPTZ,
    failure_reason TEXT,
    recovery_priority TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLE 4: audit_logs
-- ==========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_case_id UUID REFERENCES recovery_cases(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    actor TEXT NOT NULL,
    event_type TEXT NOT NULL,
    reason TEXT,
    result TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLE 5: conversations
-- ==========================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_case_id UUID NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    detected_intent TEXT,
    confidence_score NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLE 6: webhook_events (Persistent Webhook Replay Protection)
-- ==========================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- INDEXES
-- ==========================================
-- payments indexes
CREATE INDEX idx_payments_merchant_id ON payments(merchant_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_id ON payments(payment_id);

-- recovery_cases indexes
CREATE INDEX idx_recovery_cases_payment_id ON recovery_cases(payment_id);
CREATE INDEX idx_recovery_cases_merchant_id ON recovery_cases(merchant_id);
CREATE INDEX idx_recovery_cases_recovery_status ON recovery_cases(recovery_status);

-- audit_logs indexes
CREATE INDEX idx_audit_logs_recovery_case_id ON audit_logs(recovery_case_id);
CREATE INDEX idx_audit_logs_payment_id ON audit_logs(payment_id);

-- conversations indexes
CREATE INDEX idx_conversations_recovery_case_id ON conversations(recovery_case_id);

-- webhook_events indexes
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Authenticated Merchant-Scoped RLS Policies
-- 1. Merchants Policies
CREATE POLICY "Authenticated merchants read own record" ON merchants FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Authenticated merchants update own record" ON merchants FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Payments Policies
CREATE POLICY "Authenticated merchants read own payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = merchant_id);
CREATE POLICY "Authenticated merchants insert own payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = merchant_id);

-- 3. Recovery Cases Policies
CREATE POLICY "Authenticated merchants read own recovery cases" ON recovery_cases FOR SELECT TO authenticated USING (auth.uid() = merchant_id);
CREATE POLICY "Authenticated merchants insert own recovery cases" ON recovery_cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = merchant_id);

-- 4. Audit Logs Policies (Append-Only)
CREATE POLICY "Authenticated merchants read own audit logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated merchants insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Conversations Policies
CREATE POLICY "Authenticated merchants read own conversations" ON conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated merchants insert conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Webhook Events Policies
CREATE POLICY "Authenticated read webhook events" ON webhook_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert webhook events" ON webhook_events FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================
-- TRIGGERS FOR TIMESTAMPTZ updated_at UPDATES
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_recovery_cases_updated_at BEFORE UPDATE ON recovery_cases FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- EXPLICIT DATABASE ROLE GRANTS
-- ==========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

