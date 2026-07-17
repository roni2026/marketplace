-- Add contact_phone, call_clicks, and whatsapp_clicks columns to the ads table
-- This migration supports the new contact phone feature and click tracking

ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS call_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_clicks integer DEFAULT 0;
