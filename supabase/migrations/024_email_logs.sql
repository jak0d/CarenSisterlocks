-- Email Logs Table for tracking sent emails
-- Run this migration in Supabase SQL Editor

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
    resend_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_booking_id ON email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all email logs
CREATE POLICY "Admins can view all email logs"
    ON email_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Workers can view email logs for their bookings
CREATE POLICY "Workers can view email logs for their bookings"
    ON email_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            JOIN workers w ON b.worker_id = w.id
            JOIN users u ON w.email = u.email
            WHERE b.id = email_logs.booking_id
            AND u.id = auth.uid()
            AND u.role = 'worker'
        )
    );

-- Service role can insert/update email logs
CREATE POLICY "Service role can manage email logs"
    ON email_logs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_logs_updated_at_trigger
    BEFORE UPDATE ON email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_email_logs_updated_at();

-- Add comment
COMMENT ON TABLE email_logs IS 'Tracks all email notifications sent through the system';
