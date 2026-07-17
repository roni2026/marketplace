-- Add secondary_phone to profiles and ads tables
-- Supports optional secondary contact number for users and listings

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS secondary_phone text;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS secondary_phone text;
