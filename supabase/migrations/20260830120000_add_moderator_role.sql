-- Add a third permission level: moderator (between superadmin 'admin' and
-- regular 'user'/student). Kept as a separate migration from anything that
-- *uses* the new enum value, since Postgres doesn't allow a new enum value
-- to be used in the same transaction it was added in.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
