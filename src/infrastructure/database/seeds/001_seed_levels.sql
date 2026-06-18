-- Seed 001: published Arrow Untangle levels
-- Arrows are stored tail -> head. Direction is the head ray direction.

INSERT INTO levels (
  id, name, description, difficulty, status, version,
  arrows, attempts, time_limit_seconds, move_count, created_at, updated_at
)
VALUES
(
  '550e8400-e29b-41d4-a716-446655440010',
  'Tutorial Knot',
  'Clear the free arrows first and watch the knot disappear.',
  'EASY',
  'PUBLISHED',
  1,
  '[
    {"id":"a","color":"#5262FB","path":[{"row":0,"col":0},{"row":0,"col":1}],"direction":"RIGHT"},
    {"id":"b","color":"#56D879","path":[{"row":1,"col":0}],"direction":"UP"}
  ]'::jsonb,
  5,
  NULL,
  NULL,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440011',
  'First Block',
  'One vertical arrow blocks a horizontal arrow until it is removed.',
  'EASY',
  'PUBLISHED',
  1,
  '[
    {"id":"a","color":"#5262FB","path":[{"row":0,"col":0},{"row":0,"col":1}],"direction":"RIGHT"},
    {"id":"b","color":"#FFC83D","path":[{"row":-1,"col":2},{"row":0,"col":2},{"row":1,"col":2}],"direction":"DOWN"},
    {"id":"c","color":"#56D879","path":[{"row":2,"col":-1},{"row":2,"col":0}],"direction":"LEFT"}
  ]'::jsonb,
  5,
  NULL,
  NULL,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440012',
  'Layered Knot',
  'A larger acyclic knot using overlaps and negative coordinates.',
  'MEDIUM',
  'PUBLISHED',
  1,
  '[
    {"id":"a","color":"#5262FB","path":[{"row":0,"col":-2},{"row":0,"col":-1},{"row":0,"col":0}],"direction":"RIGHT"},
    {"id":"b","color":"#9DA6FB","path":[{"row":-2,"col":1},{"row":-1,"col":1},{"row":0,"col":1}],"direction":"DOWN"},
    {"id":"c","color":"#FFC83D","path":[{"row":1,"col":1},{"row":1,"col":2},{"row":1,"col":3}],"direction":"RIGHT"},
    {"id":"d","color":"#56D879","path":[{"row":2,"col":-1},{"row":2,"col":0},{"row":2,"col":1}],"direction":"UP"}
  ]'::jsonb,
  4,
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      difficulty = EXCLUDED.difficulty,
      status = EXCLUDED.status,
      version = EXCLUDED.version,
      arrows = EXCLUDED.arrows,
      attempts = EXCLUDED.attempts,
      time_limit_seconds = EXCLUDED.time_limit_seconds,
      move_count = EXCLUDED.move_count,
      updated_at = EXCLUDED.updated_at;
