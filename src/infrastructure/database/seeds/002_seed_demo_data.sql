-- Seed 002: demo users, progress and leaderboard data for local gameplay tests
-- Demo login:
--   email: demo@arrowmaze.test
--   password: Password123!

INSERT INTO users (id, email, username, password_hash, role, status, created_at, updated_at)
VALUES
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'demo@arrowmaze.test',
    'demo_player',
    '$2b$10$aa37iFFglWjt6nlwkyNV3OCnnZCXGnN2o81ujv6Yf3ZSzJKYhlnPq',
    'USER',
    'ACTIVE',
    NOW() - INTERVAL '6 days',
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440002',
    'mika@arrowmaze.test',
    'mika_arrows',
    '$2b$10$aa37iFFglWjt6nlwkyNV3OCnnZCXGnN2o81ujv6Yf3ZSzJKYhlnPq',
    'USER',
    'ACTIVE',
    NOW() - INTERVAL '5 days',
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440003',
    'noah@arrowmaze.test',
    'noah_escape',
    '$2b$10$aa37iFFglWjt6nlwkyNV3OCnnZCXGnN2o81ujv6Yf3ZSzJKYhlnPq',
    'USER',
    'ACTIVE',
    NOW() - INTERVAL '4 days',
    NOW()
  )
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      username = EXCLUDED.username,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = NOW();

INSERT INTO player_progress (id, user_id, version, updated_at)
VALUES
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    3,
    NOW()
  )
ON CONFLICT (user_id) DO UPDATE
  SET version = EXCLUDED.version,
      updated_at = NOW();

INSERT INTO completed_levels
  (id, progress_id, level_id, best_score, best_time_seconds, best_moves_count, completed_at, updated_at)
VALUES
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440010',
    980,
    18,
    4,
    NOW() - INTERVAL '3 days',
    NOW()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440002',
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440011',
    920,
    35,
    7,
    NOW() - INTERVAL '2 days',
    NOW()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003',
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440012',
    860,
    62,
    10,
    NOW() - INTERVAL '1 day',
    NOW()
  )
ON CONFLICT (progress_id, level_id) DO UPDATE
  SET best_score = EXCLUDED.best_score,
      best_time_seconds = EXCLUDED.best_time_seconds,
      best_moves_count = EXCLUDED.best_moves_count,
      completed_at = EXCLUDED.completed_at,
      updated_at = NOW();

INSERT INTO leaderboards (id, level_id, max_entries, updated_at)
VALUES
  ('990e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440010', 10, NOW()),
  ('990e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440011', 10, NOW()),
  ('990e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440012', 10, NOW())
ON CONFLICT (level_id) DO UPDATE
  SET max_entries = EXCLUDED.max_entries,
      updated_at = NOW();

INSERT INTO leaderboard_entries
  (id, leaderboard_id, user_id, level_id, username_snapshot, score, time_seconds, moves_count, rank, submitted_at)
VALUES
  ('aa0e8400-e29b-41d4-a716-446655440101', '990e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', 'demo_player', 980, 18, 4, 1, NOW() - INTERVAL '3 days'),
  ('aa0e8400-e29b-41d4-a716-446655440102', '990e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440010', 'mika_arrows', 940, 22, 5, 2, NOW() - INTERVAL '2 days'),
  ('aa0e8400-e29b-41d4-a716-446655440103', '990e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440010', 'noah_escape', 900, 31, 6, 3, NOW() - INTERVAL '1 day'),

  ('aa0e8400-e29b-41d4-a716-446655440111', '990e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440011', 'mika_arrows', 960, 29, 6, 1, NOW() - INTERVAL '3 days'),
  ('aa0e8400-e29b-41d4-a716-446655440112', '990e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'demo_player', 920, 35, 7, 2, NOW() - INTERVAL '2 days'),
  ('aa0e8400-e29b-41d4-a716-446655440113', '990e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440011', 'noah_escape', 870, 47, 9, 3, NOW() - INTERVAL '1 day'),

  ('aa0e8400-e29b-41d4-a716-446655440121', '990e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440012', 'noah_escape', 910, 55, 9, 1, NOW() - INTERVAL '3 days'),
  ('aa0e8400-e29b-41d4-a716-446655440122', '990e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 'demo_player', 860, 62, 10, 2, NOW() - INTERVAL '2 days'),
  ('aa0e8400-e29b-41d4-a716-446655440123', '990e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', 'mika_arrows', 800, 78, 12, 3, NOW() - INTERVAL '1 day')
ON CONFLICT (leaderboard_id, user_id) DO UPDATE
  SET username_snapshot = EXCLUDED.username_snapshot,
      score = EXCLUDED.score,
      time_seconds = EXCLUDED.time_seconds,
      moves_count = EXCLUDED.moves_count,
      rank = EXCLUDED.rank,
      submitted_at = EXCLUDED.submitted_at;
