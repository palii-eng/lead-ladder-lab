-- Add a fourth role: tester. Testers can explore the simulator with a hard
-- cap on how many scenarios they can create, and cannot submit scenarios
-- for moderator review (that's reserved for real AdsSchool students).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tester';
