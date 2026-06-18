-- Seed 001: published levels for initial game catalog
-- Board layout notation: S=START, E=EXIT, arrows indicate direction

-- Level 1: Tutorial (3x3, EASY)
-- S→ →↓
-- ↑  →→ E
-- ↑  ←←
INSERT INTO levels (id, name, description, difficulty, status, version, board_rows, board_cols, time_limit_seconds, move_count, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440010',
  'Tutorial',
  'Your first arrow maze. Follow the arrows to find the exit.',
  'EASY',
  'PUBLISHED',
  1,
  3,
  3,
  NULL,
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO level_cells (level_id, row, col, type, direction) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 0, 0, 'START', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440010', 0, 1, 'ARROW', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440010', 0, 2, 'ARROW', 'DOWN'),
  ('550e8400-e29b-41d4-a716-446655440010', 1, 0, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440010', 1, 1, 'ARROW', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440010', 1, 2, 'EXIT',  NULL),
  ('550e8400-e29b-41d4-a716-446655440010', 2, 0, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440010', 2, 1, 'ARROW', 'LEFT'),
  ('550e8400-e29b-41d4-a716-446655440010', 2, 2, 'ARROW', 'LEFT')
ON CONFLICT (level_id, row, col) DO NOTHING;

-- Level 2: Crossroads (4x4, EASY)
-- S→  ↓  ←  ←
-- ↑   ↓  ↑  ↑
-- ↑   →  →  ↑
-- →   ↑  ←  E
INSERT INTO levels (id, name, description, difficulty, status, version, board_rows, board_cols, time_limit_seconds, move_count, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440011',
  'Crossroads',
  'A bit more complex. Watch for loops.',
  'EASY',
  'PUBLISHED',
  1,
  4,
  4,
  NULL,
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO level_cells (level_id, row, col, type, direction) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 0, 0, 'START', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440011', 0, 1, 'ARROW', 'DOWN'),
  ('550e8400-e29b-41d4-a716-446655440011', 0, 2, 'ARROW', 'LEFT'),
  ('550e8400-e29b-41d4-a716-446655440011', 0, 3, 'ARROW', 'LEFT'),
  ('550e8400-e29b-41d4-a716-446655440011', 1, 0, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440011', 1, 1, 'ARROW', 'DOWN'),
  ('550e8400-e29b-41d4-a716-446655440011', 1, 2, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440011', 1, 3, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440011', 2, 0, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440011', 2, 1, 'ARROW', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440011', 2, 2, 'ARROW', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440011', 2, 3, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440011', 3, 0, 'ARROW', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440011', 3, 1, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440011', 3, 2, 'ARROW', 'LEFT'),
  ('550e8400-e29b-41d4-a716-446655440011', 3, 3, 'EXIT',  NULL)
ON CONFLICT (level_id, row, col) DO NOTHING;

-- Level 3: Spiral (4x4, MEDIUM)
-- S→  →  →  ↓
-- ↑   →  ↓  ↓
-- ↑   ↑  ←  ↓
-- ↑   ←  ←  E
INSERT INTO levels (id, name, description, difficulty, status, version, board_rows, board_cols, time_limit_seconds, move_count, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440012',
  'Spiral',
  'Follow the spiral path to reach the exit.',
  'MEDIUM',
  'PUBLISHED',
  1,
  4,
  4,
  120,
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO level_cells (level_id, row, col, type, direction) VALUES
  ('550e8400-e29b-41d4-a716-446655440012', 0, 0, 'START', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440012', 0, 1, 'ARROW', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440012', 0, 2, 'ARROW', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440012', 0, 3, 'ARROW', 'DOWN'),
  ('550e8400-e29b-41d4-a716-446655440012', 1, 0, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440012', 1, 1, 'ARROW', 'RIGHT'),
  ('550e8400-e29b-41d4-a716-446655440012', 1, 2, 'ARROW', 'DOWN'),
  ('550e8400-e29b-41d4-a716-446655440012', 1, 3, 'ARROW', 'DOWN'),
  ('550e8400-e29b-41d4-a716-446655440012', 2, 0, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440012', 2, 1, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440012', 2, 2, 'ARROW', 'LEFT'),
  ('550e8400-e29b-41d4-a716-446655440012', 2, 3, 'ARROW', 'DOWN'),
  ('550e8400-e29b-41d4-a716-446655440012', 3, 0, 'ARROW', 'UP'),
  ('550e8400-e29b-41d4-a716-446655440012', 3, 1, 'ARROW', 'LEFT'),
  ('550e8400-e29b-41d4-a716-446655440012', 3, 2, 'ARROW', 'LEFT'),
  ('550e8400-e29b-41d4-a716-446655440012', 3, 3, 'EXIT',  NULL)
ON CONFLICT (level_id, row, col) DO NOTHING;
