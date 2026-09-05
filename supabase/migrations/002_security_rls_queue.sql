-- ===================================================
-- RECOVRA MIGRATION 002: Security RLS & Queue Persistence
-- ===================================================

-- 1. Create recovery_queue Table (Durable Queue)
CREATE TABLE IF NOT EXISTS recovery_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_case_id UUID NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    scheduled_retry_at TIMESTAMPTZ NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    leased_until TIMESTAMPTZ,
    worker_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create merchant_settings Table
CREATE TABLE IF NOT EXISTS merchant_settings (
    merchant_id UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
    max_retries INTEGER NOT NULL DEFAULT 4,
    cooldown_minutes INTEGER NOT NULL DEFAULT 5,
    confidence_threshold INTEGER NOT NULL DEFAULT 80,
    alerts_email TEXT,
    slack_webhook TEXT,
    environment TEXT NOT NULL DEFAULT 'sandbox',
    demo_mode BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create payment_links Table
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_link_id TEXT UNIQUE,
    recovery_case_id UUID REFERENCES recovery_cases(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    short_url TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    simulated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_recovery_queue_case_id ON recovery_queue(recovery_case_id);
CREATE INDEX IF NOT EXISTS idx_recovery_queue_merchant_id ON recovery_queue(merchant_id);
CREATE INDEX IF NOT EXISTS idx_recovery_queue_status_retry ON recovery_queue(status, scheduled_retry_at);
CREATE INDEX IF NOT EXISTS idx_payment_links_razorpay_id ON payment_links(razorpay_link_id);

-- 5. Row Level Security Policies for Merchant Isolation
ALTER TABLE recovery_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant queue read policy" ON recovery_queue FOR SELECT TO authenticated USING (auth.uid() = merchant_id);
CREATE POLICY "Merchant queue insert policy" ON recovery_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchant settings read policy" ON merchant_settings FOR SELECT TO authenticated USING (auth.uid() = merchant_id);
CREATE POLICY "Merchant settings write policy" ON merchant_settings FOR ALL TO authenticated USING (auth.uid() = merchant_id);

CREATE POLICY "Merchant payment links read policy" ON payment_links FOR SELECT TO authenticated USING (auth.uid() = merchant_id);
CREATE POLICY "Merchant payment links write policy" ON payment_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = merchant_id);
