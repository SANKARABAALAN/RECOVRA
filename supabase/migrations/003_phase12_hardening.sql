-- Phase 12 hardening: forward-only schema corrections.
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE recovery_queue ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE CASCADE;
ALTER TABLE recovery_queue ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'WAIT_AND_RETRY';
ALTER TABLE recovery_queue ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE recovery_queue ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE recovery_queue ADD COLUMN IF NOT EXISTS payment_link_url TEXT;
ALTER TABLE recovery_queue ADD CONSTRAINT recovery_queue_status_check CHECK (status IN ('QUEUED','RUNNING','WAITING_FOR_PAYMENT','SUCCESS','FAILED','CANCELLED'));

ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Replace broad policies with merchant ownership derived from merchant profiles.
DROP POLICY IF EXISTS "Authenticated merchants read own record" ON merchants;
DROP POLICY IF EXISTS "Authenticated merchants update own record" ON merchants;
CREATE POLICY "merchant_profile_owner" ON merchants FOR ALL TO authenticated USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Authenticated merchants read own payments" ON payments;
DROP POLICY IF EXISTS "Authenticated merchants insert own payments" ON payments;
CREATE POLICY "merchant_payment_access" ON payments FOR ALL TO authenticated USING (merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid())) WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated merchants read own recovery cases" ON recovery_cases;
DROP POLICY IF EXISTS "Authenticated merchants insert own recovery cases" ON recovery_cases;
CREATE POLICY "merchant_case_access" ON recovery_cases FOR ALL TO authenticated USING (merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid())) WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated merchants read own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated merchants insert audit logs" ON audit_logs;
CREATE POLICY "merchant_audit_read" ON audit_logs FOR SELECT TO authenticated USING (payment_id IN (SELECT id FROM payments WHERE merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated merchants read own conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated merchants insert conversations" ON conversations;
CREATE POLICY "merchant_conversation_access" ON conversations FOR ALL TO authenticated USING (recovery_case_id IN (SELECT id FROM recovery_cases WHERE merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid()))) WITH CHECK (recovery_case_id IN (SELECT id FROM recovery_cases WHERE merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid())));

DROP POLICY IF EXISTS "Merchant queue read policy" ON recovery_queue;
DROP POLICY IF EXISTS "Merchant queue insert policy" ON recovery_queue;
CREATE POLICY "merchant_queue_access" ON recovery_queue FOR ALL TO authenticated USING (merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid())) WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE auth_user_id = auth.uid()));
