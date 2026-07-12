export const openApiSpec = {
  openapi: '3.0.3',
  info: { title: 'Arrow Maze API', version: '0.1.0' },
  paths: {
    '/health': {
      get: {
        summary: 'Check API health',
        responses: {
          '200': { description: 'API is running' },
          '404': {
            description: 'Route not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'NOT_FOUND', message: 'Route not found: GET /unknown' } },
              },
            },
          },
          '500': {
            description: 'Unexpected server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
              },
            },
          },
        },
      },
    },
    '/daily-challenge': {
      get: {
        summary: 'Get the UTC daily challenge',
        tags: ['Daily Challenge'],
        responses: {
          '200': {
            description: 'Daily challenge for the current UTC date',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyChallengeResponse' },
                example: {
                  status: 'success',
                  data: {
                    challenge: {
                      date: '2026-07-10',
                      seed: 'daily-2026-07-10',
                      targetDifficulty: 'MEDIUM',
                      source: 'gemini',
                      generatedAt: '2026-07-10T04:00:00.000Z',
                      expiresAt: '2026-07-11T00:00:00.000Z',
                      validation: {
                        solvable: true,
                        difficultyMatched: true,
                        fallbackUsed: false,
                      },
                      level: {
                        name: 'Daily Challenge 2026-07-10',
                        description: 'A validated daily Arrow Untangle puzzle.',
                        difficulty: 'MEDIUM',
                        definition: {
                          attempts: 5,
                          arrows: [
                            {
                              id: 'arrow-0',
                              color: '#4B6BFB',
                              path: [{ row: 0, col: 0 }],
                              direction: 'RIGHT',
                            },
                          ],
                          boardShape: { type: 'CELL_MASK', cells: [{ row: 0, col: 0 }] },
                        },
                        timeLimitSeconds: 120,
                      },
                    },
                  },
                },
              },
            },
          },
          '503': {
            description: 'Daily challenge generation unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  status: 'error',
                  error: { code: 'DAILY_CHALLENGE_UNAVAILABLE', message: 'Daily challenge unavailable' },
                },
              },
            },
          },
        },
      },
    },
    '/admin/daily-challenge/iterations': {
      post: {
        summary: 'Start an admin manual daily challenge iteration',
        tags: ['Daily Challenge', 'Admin'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DailyChallengeIterationRequest' },
              example: { date: '2026-07-11' },
            },
          },
        },
        responses: {
          '202': {
            description: 'Iteration accepted; poll the operation for progress',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyChallengeIterationResponse' },
                example: {
                  status: 'success',
                  data: {
                    operation: {
                      operationId: 'f39dd177-bde0-4fd8-84cb-8cd353ffc224',
                      date: '2026-07-11',
                      status: 'RUNNING',
                      requestedAt: '2026-07-11T14:00:00.000Z',
                      completedAt: null,
                      events: [
                        {
                          sequence: 1,
                          type: 'REQUESTED',
                          message: 'Daily challenge iteration requested',
                          createdAt: '2026-07-11T14:00:00.000Z',
                        },
                      ],
                      challenge: null,
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid or future UTC date',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  status: 'error',
                  error: { code: 'INVALID_DAILY_CHALLENGE_DATE', message: 'Invalid daily challenge date' },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required' } },
              },
            },
          },
          '409': {
            description: 'An iteration is already running for the date',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyChallengeIterationConflictResponse' },
                example: {
                  status: 'error',
                  error: {
                    code: 'DAILY_CHALLENGE_ITERATION_IN_PROGRESS',
                    message: 'Daily challenge iteration already in progress',
                  },
                  data: {
                    operation: {
                      operationId: 'f39dd177-bde0-4fd8-84cb-8cd353ffc224',
                      date: '2026-07-11',
                      status: 'RUNNING',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/daily-challenge/iterations/{operationId}': {
      get: {
        summary: 'Poll an admin manual daily challenge iteration',
        tags: ['Daily Challenge', 'Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'operationId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Iteration operation with ordered, sanitized events',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyChallengeIterationResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required' } },
              },
            },
          },
          '404': {
            description: 'Unknown iteration operation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  status: 'error',
                  error: {
                    code: 'DAILY_CHALLENGE_ITERATION_NOT_FOUND',
                    message: 'Daily challenge iteration not found',
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Identity'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              example: { email: 'player@example.com', username: 'arrow_player', rawPassword: 'SecurePass1!' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterResponse' },
                example: { status: 'success', data: { userId: '550e8400-e29b-41d4-a716-446655440000' } },
              },
            },
          },
          '400': {
            description: 'Missing fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'email is required' } },
              },
            },
          },
          '409': {
            description: 'Email or username taken',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'CONFLICT', message: 'Email already registered' } },
              },
            },
          },
          '422': {
            description: 'Domain validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNPROCESSABLE_ENTITY', message: 'Password must be at least 8 characters' } },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user and get token',
        tags: ['Identity'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: { email: 'player@example.com', rawPassword: 'SecurePass1!' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
                example: {
                  status: 'success',
                  data: {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc1MDIwMDAwMH0.signature',
                    refreshToken: 'b9f1c2e3a4d5...opaque-base64url',
                    userId: '550e8400-e29b-41d4-a716-446655440000',
                    username: 'arrow_player',
                    role: 'USER',
                  },
                },
              },
            },
          },
          '400': {
            description: 'Missing fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'email is required' } },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } },
              },
            },
          },
          '403': {
            description: 'Account suspended',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Account is suspended' } },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Exchange a refresh token for a new access + rotated refresh token',
        tags: ['Identity'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
              example: { refreshToken: 'b9f1c2e3a4d5...opaque-base64url' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token rotated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshResponse' },
                example: {
                  status: 'success',
                  data: { accessToken: 'eyJ...new.access', refreshToken: 'c0d1e2...new-opaque' },
                },
              },
            },
          },
          '400': {
            description: 'Missing refreshToken',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'refreshToken is required' } },
              },
            },
          },
          '401': {
            description: 'Invalid, expired, or revoked refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } },
              },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Revoke a refresh token (idempotent)',
        tags: ['Identity'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
              example: { refreshToken: 'b9f1c2e3a4d5...opaque-base64url' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged out (token revoked if it existed)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
                example: { status: 'success', data: null },
              },
            },
          },
          '400': {
            description: 'Missing refreshToken',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'refreshToken is required' } },
              },
            },
          },
        },
      },
    },
    '/users/me': {
      get: {
        summary: 'Get the authenticated user profile',
        tags: ['Identity'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Authenticated user profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CurrentUserResponse' },
                example: {
                  status: 'success',
                  data: {
                    userId: '550e8400-e29b-41d4-a716-446655440000',
                    email: 'player@example.com',
                    username: 'arrow_player',
                    role: 'USER',
                  },
                },
              },
            },
          },
          '401': {
            description: 'Missing, invalid or expired token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '404': {
            description: 'Authenticated user no longer exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'NOT_FOUND', message: 'User not found' } },
              },
            },
          },
        },
      },
    },
    '/leaderboard/scores': {
      post: {
        summary: 'Submit a player score to the leaderboard',
        tags: ['Leaderboard'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubmitScoreRequest' },
              example: {
                levelId: '550e8400-e29b-41d4-a716-446655440020',
                score: 1500,
                timeSeconds: 45,
                movesCount: 30,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Score submitted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
                example: { status: 'success', data: null },
              },
            },
          },
          '400': {
            description: 'Missing or invalid fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'levelId, score, timeSeconds and movesCount are required' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '422': {
            description: 'Score validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNPROCESSABLE_ENTITY', message: 'Score must be a non-negative integer' } },
              },
            },
          },
        },
      },
    },
    '/progress/me': {
      get: {
        summary: 'Load authenticated user progress',
        tags: ['Progress'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Progress loaded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProgressResponse' },
                example: {
                  status: 'success',
                  data: {
                    progressId: '550e8400-e29b-41d4-a716-446655440010',
                    userId: '550e8400-e29b-41d4-a716-446655440000',
                    version: 2,
                    updatedAt: '2026-06-18T00:00:00Z',
                    completedLevels: [
                      {
                        levelId: '550e8400-e29b-41d4-a716-446655440020',
                        score: 1500,
                        timeSeconds: 45,
                        movesCount: 30,
                        completedAt: '2026-06-18T00:00:00Z',
                      },
                    ],
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
        },
      },
    },
    '/progress/levels/{levelId}/complete': {
      post: {
        summary: 'Record a level completion for the authenticated user',
        tags: ['Progress'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CompleteLevelRequest' },
              example: { score: 1500, timeSeconds: 45, movesCount: 30, completedAt: '2026-06-18T00:00:00Z' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Level completion recorded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
                example: { status: 'success', data: null },
              },
            },
          },
          '400': {
            description: 'Missing fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'score, timeSeconds, movesCount and completedAt are required' } },
              },
            },
          },
          '422': {
            description: 'Invalid completion timestamp',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'INVALID_ARGUMENT', message: 'CompletedAt must be a valid date' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
        },
      },
    },
    '/progress/sync': {
      put: {
        summary: 'Sync offline progress with server (offline-first merge)',
        tags: ['Progress'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SyncProgressRequest' },
              example: {
                completedLevels: [
                  {
                    levelId: '550e8400-e29b-41d4-a716-446655440020',
                    score: 1500,
                    timeSeconds: 45,
                    movesCount: 30,
                    completedAt: '2026-06-18T00:00:00Z',
                  },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Merged progress',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProgressResponse' },
                example: {
                  status: 'success',
                  data: {
                    progressId: '550e8400-e29b-41d4-a716-446655440010',
                    userId: '550e8400-e29b-41d4-a716-446655440000',
                    version: 3,
                    updatedAt: '2026-06-18T01:00:00Z',
                    completedLevels: [
                      {
                        levelId: '550e8400-e29b-41d4-a716-446655440020',
                        score: 1500,
                        timeSeconds: 45,
                        movesCount: 30,
                        completedAt: '2026-06-18T00:00:00Z',
                      },
                    ],
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid body',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'completedLevels must be an array' } },
              },
            },
          },
          '422': {
            description: 'Invalid completion timestamp',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'INVALID_ARGUMENT', message: 'CompletedAt must be a valid date' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
        },
      },
    },
    '/levels': {
      get: {
        summary: 'List all published levels',
        tags: ['Level Catalog'],
        responses: {
          '200': {
            description: 'Published levels list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LevelsListResponse' },
                example: {
                  status: 'success',
                  data: {
                    levels: [
                      { levelId: '550e8400-e29b-41d4-a716-446655440020', name: 'Corridor', difficulty: 'EASY', createdAt: '2026-06-18T00:00:00Z' },
                      { levelId: '550e8400-e29b-41d4-a716-446655440021', name: 'Crossroads', difficulty: 'MEDIUM', createdAt: '2026-06-18T00:00:00Z' },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new level (admin only)',
        tags: ['Level Catalog'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateLevelRequest' },
              example: {
                name: 'Tutorial Knot',
                description: 'A beginner arrow untangle level',
                difficulty: 'EASY',
                attempts: 5,
                arrows: [
                  {
                    id: 'a',
                    color: '#5262FB',
                    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
                    direction: 'RIGHT',
                  },
                ],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Level created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateLevelResponse' },
                example: { status: 'success', data: { levelId: '550e8400-e29b-41d4-a716-446655440020' } },
              },
            },
          },
          '400': {
            description: 'Missing required fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'name, description, difficulty, boardSize and cells are required' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required' } },
              },
            },
          },
          '422': {
            description: 'Level is not solvable or domain validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNPROCESSABLE_ENTITY', message: 'Level has no solution path from START to END' } },
              },
            },
          },
        },
      },
    },
    '/levels/{levelId}': {
      get: {
        summary: 'Get a level by ID',
        tags: ['Level Catalog'],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Level detail',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LevelDetailResponse' },
                example: {
                  status: 'success',
                  data: {
                    level: {
                      levelId: '550e8400-e29b-41d4-a716-446655440020',
                      name: 'Corridor',
                      description: 'A simple one-directional path',
                      difficulty: 'EASY',
                      status: 'PUBLISHED',
                      version: 1,
                      createdAt: '2026-06-18T00:00:00Z',
                      updatedAt: '2026-06-18T00:00:00Z',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid UUID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' } },
              },
            },
          },
          '404': {
            description: 'Level not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'NOT_FOUND', message: 'Level not found' } },
              },
            },
          },
        },
      },
    },
    '/levels/{levelId}/definition': {
      put: {
        summary: 'Update level arrow definition (admin only)',
        tags: ['Level Catalog'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateLevelDefinitionRequest' },
              example: {
                boardSize: { rows: 3, cols: 3 },
                cells: [
                  { position: { row: 0, col: 0 }, type: 'START' },
                  { position: { row: 0, col: 1 }, type: 'ARROW', direction: 'RIGHT' },
                  { position: { row: 0, col: 2 }, type: 'END' },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Definition updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LevelIdResponse' },
                example: { status: 'success', data: { levelId: '550e8400-e29b-41d4-a716-446655440020' } },
              },
            },
          },
          '400': {
            description: 'Missing required fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'boardSize and cells are required' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required' } },
              },
            },
          },
          '404': {
            description: 'Level not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'NOT_FOUND', message: 'Level not found' } },
              },
            },
          },
        },
      },
    },
    '/levels/{levelId}/publish': {
      post: {
        summary: 'Publish a level (admin only)',
        tags: ['Level Catalog'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Level published',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LevelIdResponse' },
                example: { status: 'success', data: { levelId: '550e8400-e29b-41d4-a716-446655440020' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required' } },
              },
            },
          },
          '404': {
            description: 'Level not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'NOT_FOUND', message: 'Level not found' } },
              },
            },
          },
          '422': {
            description: 'Level is not solvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNPROCESSABLE_ENTITY', message: 'Level has no solution path from START to END' } },
              },
            },
          },
        },
      },
    },
    '/levels/{levelId}/archive': {
      post: {
        summary: 'Archive a level (admin only)',
        tags: ['Level Catalog'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Level archived',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LevelIdResponse' },
                example: { status: 'success', data: { levelId: '550e8400-e29b-41d4-a716-446655440020' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required' } },
              },
            },
          },
          '404': {
            description: 'Level not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'NOT_FOUND', message: 'Level not found' } },
              },
            },
          },
        },
      },
    },
    '/admin/levels': {
      get: {
        summary: 'List all levels for admin',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
          },
        ],
        responses: {
          '200': {
            description: 'Admin level list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminLevelsResponse' },
                example: {
                  status: 'success',
                  data: {
                    levels: [
                      {
                        levelId: '550e8400-e29b-41d4-a716-446655440020',
                        name: 'Corridor',
                        difficulty: 'EASY',
                        status: 'DRAFT',
                        arrowCount: 2,
                        attempts: 5,
                        createdAt: '2026-06-18T00:00:00Z',
                      },
                    ],
                  },
                },
              },
            },
          },
          '400': {
            description: 'Unknown status filter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'Unknown status filter: NONSENSE' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required' } },
              },
            },
          },
        },
      },
    },
    '/admin/users': {
      get: {
        summary: 'List users for admin',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Admin user list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminUserListResponse' },
                example: {
                  status: 'success',
                  data: {
                    users: [
                      {
                        userId: '660e8400-e29b-41d4-a716-446655440001',
                        email: 'demo@arrowmaze.test',
                        username: 'demo_player',
                        role: 'USER',
                        status: 'ACTIVE',
                        createdAt: '2026-06-18T00:00:00Z',
                      },
                    ],
                    page: 1,
                    limit: 20,
                    total: 1,
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid pagination query',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'BAD_REQUEST', message: 'page must be a positive integer' } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required' } },
              },
            },
          },
        },
      },
    },
    '/leaderboard/{levelId}': {
      get: {
        summary: 'Get leaderboard for a level',
        tags: ['Leaderboard'],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, example: '550e8400-e29b-41d4-a716-446655440020' }],
        responses: {
          '200': {
            description: 'Leaderboard retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LeaderboardResponse' },
                example: {
                  status: 'success',
                  data: {
                    leaderboardId: '550e8400-e29b-41d4-a716-446655440001',
                    levelId: '550e8400-e29b-41d4-a716-446655440020',
                    updatedAt: '2026-06-18T00:00:00Z',
                    entries: [
                      {
                        entryId: '550e8400-e29b-41d4-a716-446655440002',
                        userId: '550e8400-e29b-41d4-a716-446655440000',
                        usernameSnapshot: 'arrow_player',
                        score: 1500,
                        timeSeconds: 45,
                        movesCount: 30,
                        rank: 1,
                        submittedAt: '2026-06-18T00:00:00Z',
                      },
                    ],
                  },
                },
              },
            },
          },
          '404': {
            description: 'Leaderboard not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { status: 'error', error: { code: 'NOT_FOUND', message: 'Leaderboard not found' } },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['status', 'error'],
        properties: {
          status: { type: 'string', enum: ['error'] },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object', additionalProperties: true, nullable: true },
            },
          },
        },
        example: { status: 'error', error: { code: 'NOT_FOUND', message: 'Resource not found' } },
      },
      SuccessResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: { nullable: true },
        },
        example: { status: 'success', data: null },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'username', 'rawPassword'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 30 },
          rawPassword: { type: 'string', minLength: 8 },
        },
      },
      RegisterResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: { type: 'object', required: ['userId'], properties: { userId: { type: 'string', format: 'uuid' } } },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'rawPassword'],
        properties: {
          email: { type: 'string', format: 'email' },
          rawPassword: { type: 'string', minLength: 8 },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['accessToken', 'refreshToken', 'userId', 'username', 'role'],
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              userId: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
            },
          },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      RefreshResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['accessToken', 'refreshToken'],
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
      CurrentUserResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['userId', 'email', 'username', 'role'],
            properties: {
              userId: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              username: { type: 'string' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
            },
          },
        },
      },
      SubmitScoreRequest: {
        type: 'object',
        required: ['levelId', 'score', 'timeSeconds', 'movesCount'],
        properties: {
          levelId: { type: 'string', format: 'uuid' },
          score: { type: 'integer', minimum: 0 },
          timeSeconds: { type: 'number', minimum: 0.001 },
          movesCount: { type: 'integer', minimum: 1 },
        },
      },
      CompleteLevelRequest: {
        type: 'object',
        required: ['score', 'timeSeconds', 'movesCount', 'completedAt'],
        properties: {
          score: { type: 'integer', minimum: 0 },
          timeSeconds: { type: 'number', minimum: 0.001 },
          movesCount: { type: 'integer', minimum: 1 },
          completedAt: { type: 'string', format: 'date-time' },
        },
      },
      SyncProgressRequest: {
        type: 'object',
        required: ['completedLevels'],
        properties: {
          completedLevels: {
            type: 'array',
            items: {
              type: 'object',
              required: ['levelId', 'score', 'timeSeconds', 'movesCount', 'completedAt'],
              properties: {
                levelId: { type: 'string', format: 'uuid' },
                score: { type: 'integer', minimum: 0 },
                timeSeconds: { type: 'number', minimum: 0.001 },
                movesCount: { type: 'integer', minimum: 1 },
                completedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      ProgressResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['progressId', 'userId', 'completedLevels', 'version', 'updatedAt'],
            properties: {
              progressId: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              version: { type: 'integer' },
              updatedAt: { type: 'string', format: 'date-time' },
              completedLevels: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    levelId: { type: 'string', format: 'uuid' },
                    score: { type: 'integer' },
                    timeSeconds: { type: 'number' },
                    movesCount: { type: 'integer' },
                    completedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
      PositionInput: {
        type: 'object',
        required: ['row', 'col'],
        properties: {
          row: { type: 'integer' },
          col: { type: 'integer' },
        },
      },
      ArrowSpec: {
        type: 'object',
        required: ['id', 'color', 'path', 'direction'],
        properties: {
          id: { type: 'string', minLength: 1 },
          color: { type: 'string', minLength: 1 },
          path: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/components/schemas/PositionInput' },
          },
          direction: { type: 'string', enum: ['UP', 'DOWN', 'LEFT', 'RIGHT'] },
        },
      },
      BoardShapeInput: {
        type: 'object',
        description:
          'Optional abstract board mask (Option A): a visual + authoring/placement mask, not a physical wall.',
        required: ['type', 'cells'],
        properties: {
          type: { type: 'string', enum: ['CELL_MASK'] },
          cells: {
            type: 'array',
            minItems: 1,
            maxItems: 600,
            items: { $ref: '#/components/schemas/PositionInput' },
          },
        },
      },
      BoardSizeInput: {
        type: 'object',
        description:
          'Optional rectangular authoring frame for admin-created M12 levels. Cannot be combined with boardShape.',
        required: ['rows', 'cols'],
        properties: {
          rows: { type: 'integer', minimum: 1, maximum: 12 },
          cols: { type: 'integer', minimum: 1, maximum: 12 },
        },
      },
      LevelDefinitionDto: {
        type: 'object',
        required: ['arrows', 'attempts'],
        properties: {
          arrows: { type: 'array', minItems: 1, maxItems: 60, items: { $ref: '#/components/schemas/ArrowSpec' } },
          attempts: { type: 'integer', minimum: 1 },
          boardShape: { $ref: '#/components/schemas/BoardShapeInput' },
        },
      },
      DailyChallengeLevel: {
        type: 'object',
        required: ['name', 'description', 'difficulty', 'definition'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
          definition: { $ref: '#/components/schemas/LevelDefinitionDto' },
          timeLimitSeconds: { type: 'integer', minimum: 1, nullable: true },
        },
      },
      DailyChallenge: {
        type: 'object',
        required: ['date', 'seed', 'targetDifficulty', 'source', 'generatedAt', 'expiresAt', 'validation', 'level'],
        properties: {
          date: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          seed: { type: 'string' },
          targetDifficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
          source: { type: 'string', enum: ['gemini', 'fallback'] },
          generatedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          validation: {
            type: 'object',
            required: ['solvable', 'difficultyMatched', 'fallbackUsed'],
            properties: {
              solvable: { type: 'boolean' },
              difficultyMatched: { type: 'boolean' },
              fallbackUsed: { type: 'boolean' },
            },
          },
          level: { $ref: '#/components/schemas/DailyChallengeLevel' },
        },
      },
      DailyChallengeResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['challenge'],
            properties: { challenge: { $ref: '#/components/schemas/DailyChallenge' } },
          },
        },
      },
      DailyChallengeIterationRequest: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
            description: 'Optional UTC date; defaults to the backend current UTC date. Future dates are rejected.',
          },
        },
      },
      DailyChallengeIterationEvent: {
        type: 'object',
        required: ['sequence', 'type', 'message', 'createdAt'],
        properties: {
          sequence: { type: 'integer', minimum: 1 },
          type: {
            type: 'string',
            enum: [
              'REQUESTED',
              'GENERATION_STARTED',
              'GENERATOR_SELECTED',
              'CANDIDATE_REJECTED',
              'FALLBACK_USED',
              'VALIDATION_PASSED',
              'CACHE_REPLACED',
              'FAILED',
            ],
          },
          message: { type: 'string' },
          source: { type: 'string', enum: ['gemini', 'fallback'], nullable: true },
          fallbackUsed: { type: 'boolean', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DailyChallengeIteration: {
        type: 'object',
        required: ['operationId', 'date', 'status', 'requestedAt', 'completedAt', 'events', 'challenge'],
        properties: {
          operationId: { type: 'string' },
          date: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          status: { type: 'string', enum: ['RUNNING', 'SUCCEEDED', 'FAILED'] },
          requestedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          events: {
            type: 'array',
            items: { $ref: '#/components/schemas/DailyChallengeIterationEvent' },
          },
          challenge: {
            oneOf: [{ $ref: '#/components/schemas/DailyChallenge' }, { type: 'null' }],
          },
        },
      },
      DailyChallengeIterationResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['operation'],
            properties: { operation: { $ref: '#/components/schemas/DailyChallengeIteration' } },
          },
        },
      },
      DailyChallengeIterationConflictResponse: {
        type: 'object',
        required: ['status', 'error', 'data'],
        properties: {
          status: { type: 'string', enum: ['error'] },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', enum: ['DAILY_CHALLENGE_ITERATION_IN_PROGRESS'] },
              message: { type: 'string' },
            },
          },
          data: {
            type: 'object',
            required: ['operation'],
            properties: {
              operation: {
                type: 'object',
                required: ['operationId', 'date', 'status'],
                properties: {
                  operationId: { type: 'string' },
                  date: { type: 'string' },
                  status: { type: 'string', enum: ['RUNNING'] },
                },
              },
            },
          },
        },
      },
      CreateLevelRequest: {
        type: 'object',
        required: ['name', 'description', 'difficulty', 'arrows'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
          arrows: { type: 'array', minItems: 1, maxItems: 60, items: { $ref: '#/components/schemas/ArrowSpec' } },
          attempts: { type: 'integer', minimum: 1, nullable: true },
          timeLimit: { type: 'integer', minimum: 1, nullable: true },
          boardSize: { $ref: '#/components/schemas/BoardSizeInput' },
          boardShape: { $ref: '#/components/schemas/BoardShapeInput' },
        },
      },
      UpdateLevelDefinitionRequest: {
        type: 'object',
        required: ['arrows'],
        properties: {
          arrows: { type: 'array', minItems: 1, maxItems: 60, items: { $ref: '#/components/schemas/ArrowSpec' } },
          attempts: { type: 'integer', minimum: 1, nullable: true },
        },
      },
      CreateLevelResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: { type: 'object', required: ['levelId'], properties: { levelId: { type: 'string', format: 'uuid' } } },
        },
      },
      LevelIdResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: { type: 'object', required: ['levelId'], properties: { levelId: { type: 'string', format: 'uuid' } } },
        },
      },
      LevelSummary: {
        type: 'object',
        required: ['levelId', 'name', 'difficulty', 'arrowCount', 'attempts', 'createdAt'],
        properties: {
          levelId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
          arrowCount: { type: 'integer', minimum: 1 },
          attempts: { type: 'integer', minimum: 1 },
          timeLimitSeconds: { type: 'integer', minimum: 1, nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AdminLevelSummary: {
        type: 'object',
        required: ['levelId', 'name', 'difficulty', 'status', 'arrowCount', 'attempts', 'createdAt'],
        properties: {
          levelId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
          arrowCount: { type: 'integer', minimum: 1 },
          attempts: { type: 'integer', minimum: 1 },
          timeLimitSeconds: { type: 'integer', minimum: 1, nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      LevelsListResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['levels'],
            properties: { levels: { type: 'array', items: { $ref: '#/components/schemas/LevelSummary' } } },
          },
        },
      },
      AdminLevelsResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['levels'],
            properties: { levels: { type: 'array', items: { $ref: '#/components/schemas/AdminLevelSummary' } } },
          },
        },
      },
      AdminUserSummary: {
        type: 'object',
        required: ['userId', 'email', 'username', 'role', 'status', 'createdAt'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AdminUserListResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['users', 'page', 'limit', 'total'],
            properties: {
              users: { type: 'array', items: { $ref: '#/components/schemas/AdminUserSummary' } },
              page: { type: 'integer', minimum: 1 },
              limit: { type: 'integer', minimum: 1, maximum: 100 },
              total: { type: 'integer', minimum: 0 },
            },
          },
        },
      },
      LevelDetail: {
        type: 'object',
        required: ['levelId', 'name', 'description', 'difficulty', 'status', 'version', 'definition', 'createdAt', 'updatedAt'],
        properties: {
          levelId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
          version: { type: 'integer' },
          definition: { $ref: '#/components/schemas/LevelDefinitionDto' },
          timeLimitSeconds: { type: 'integer', minimum: 1, nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      LevelDetailResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['level'],
            properties: { level: { $ref: '#/components/schemas/LevelDetail' } },
          },
        },
      },
      LeaderboardResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: {
            type: 'object',
            required: ['levelId', 'entries'],
            properties: {
              leaderboardId: { type: 'string', format: 'uuid' },
              levelId: { type: 'string', format: 'uuid' },
              updatedAt: { type: 'string', format: 'date-time' },
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['entryId', 'userId', 'usernameSnapshot', 'score', 'timeSeconds', 'movesCount', 'rank', 'submittedAt'],
                  properties: {
                    entryId: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    usernameSnapshot: { type: 'string' },
                    score: { type: 'integer' },
                    timeSeconds: { type: 'number' },
                    movesCount: { type: 'integer' },
                    rank: { type: 'integer' },
                    submittedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
