-- Allow season 0 (the Preseason). 014 tried this by constraint name; this drops
-- every CHECK on seasons.season_number whatever it's called, then adds >= 0.
-- Safe to run more than once. Deletes no data.
-- Created: 2026-11-23

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.seasons'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%season_number%'
  LOOP
    EXECUTE format('ALTER TABLE public.seasons DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.seasons ADD CONSTRAINT seasons_season_number_check CHECK (season_number >= 0);
