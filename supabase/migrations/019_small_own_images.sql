-- Replace tiny DRep pictures with their linked account's larger one (2026-11-25).
-- Some DReps publish a 64×64 CIP-119 image that looks blurry on a card. The
-- cron now measures a DRep's own image; when it is under 160 px and they link
-- an X or GitHub account, that account's 400×400 picture is shown instead.
-- Claimed-card art still wins over both. Safe to run more than once.

ALTER TABLE drep_social_avatars ADD COLUMN IF NOT EXISTS own_image_px INTEGER;  -- null = DRep has no image of their own

COMMENT ON COLUMN drep_social_avatars.own_image_px IS
  'Smaller side in pixels of the DRep''s own CIP-119 image when this row replaces it; null when they have none.';
