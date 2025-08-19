-- Remove trust_score column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trust_score;