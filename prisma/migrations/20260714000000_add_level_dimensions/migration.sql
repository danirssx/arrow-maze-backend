-- Add dimensions column to levels table.
-- 2 = flat 2-D board (SVG renderer), 3 = volumetric 3-D board (GL renderer).
-- Existing levels default to 2.
ALTER TABLE "levels" ADD COLUMN "dimensions" INTEGER NOT NULL DEFAULT 2;
