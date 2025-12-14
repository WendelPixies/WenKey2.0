-- Add note column to checkin_results table for observations
ALTER TABLE public.checkin_results 
ADD COLUMN IF NOT EXISTS note TEXT;