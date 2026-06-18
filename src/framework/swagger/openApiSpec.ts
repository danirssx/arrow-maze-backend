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
          '201': { description: 'User registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterResponse' } } } },
          '400': { description: 'Missing fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Email or username taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '422': { description: 'Domain validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
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
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          '400': { description: 'Missing fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Account suspended', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/leaderboard/scores': {
      post: {
        summary: 'Submit a player score to the leaderboard',
        tags: ['Leaderboard'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubmitScoreRequest' },
              example: {
                leaderboardId: '550e8400-e29b-41d4-a716-446655440001',
                entryId: '550e8400-e29b-41d4-a716-446655440002',
                userId: '550e8400-e29b-41d4-a716-446655440000',
                levelId: 'level-001',
                usernameSnapshot: 'arrow_player',
                score: 1500,
                timeSeconds: 45,
                movesCount: 30,
              },
            },
          },
        },
        responses: {
          '201': { description: 'Score submitted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          '400': { description: 'Missing or invalid fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '422': { description: 'Score validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/progress/me': {
      get: {
        summary: 'Load authenticated user progress',
        tags: ['Progress'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Progress loaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProgressResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/progress/levels/{levelId}/complete': {
      post: {
        summary: 'Record a level completion for the authenticated user',
        tags: ['Progress'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string' } }],
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
          '201': { description: 'Level completion recorded', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          '400': { description: 'Missing fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
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
            },
          },
        },
        responses: {
          '200': { description: 'Merged progress', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProgressResponse' } } } },
          '400': { description: 'Invalid body', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/levels': {
      get: {
        summary: 'List all published levels',
        tags: ['Level Catalog'],
        responses: {
          '200': { description: 'Published levels list', content: { 'application/json': { schema: { $ref: '#/components/schemas/LevelsListResponse' } } } },
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
          '201': { description: 'Level created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateLevelResponse' } } } },
          '400': { description: 'Missing required fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Admin access required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '422': { description: 'Level is not solvable or domain validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/levels/{levelId}': {
      get: {
        summary: 'Get a level by ID',
        tags: ['Level Catalog'],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Level detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/LevelDetailResponse' } } } },
          '400': { description: 'Invalid UUID format', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Level not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
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
            'application/json': { schema: { $ref: '#/components/schemas/UpdateLevelDefinitionRequest' } },
          },
        },
        responses: {
          '200': { description: 'Definition updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/LevelIdResponse' } } } },
          '400': { description: 'Missing required fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Admin access required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Level not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
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
          '200': { description: 'Level published', content: { 'application/json': { schema: { $ref: '#/components/schemas/LevelIdResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Admin access required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Level not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '422': { description: 'Level is not solvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
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
          '200': { description: 'Level archived', content: { 'application/json': { schema: { $ref: '#/components/schemas/LevelIdResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Admin access required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Level not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/leaderboard/{levelId}': {
      get: {
        summary: 'Get leaderboard for a level',
        tags: ['Leaderboard'],
        parameters: [{ name: 'levelId', in: 'path', required: true, schema: { type: 'string' }, example: 'level-001' }],
        responses: {
          '200': { description: 'Leaderboard retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/LeaderboardResponse' } } } },
          '404': { description: 'Leaderboard not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
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
      },
      SuccessResponse: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success'] },
          data: { nullable: true },
        },
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
            required: ['accessToken', 'userId', 'username', 'role'],
            properties: {
              accessToken: { type: 'string' },
              userId: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
            },
          },
        },
      },
      SubmitScoreRequest: {
        type: 'object',
        required: ['leaderboardId', 'entryId', 'userId', 'levelId', 'usernameSnapshot', 'score', 'timeSeconds', 'movesCount'],
        properties: {
          leaderboardId: { type: 'string', format: 'uuid' },
          entryId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          levelId: { type: 'string' },
          usernameSnapshot: { type: 'string' },
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
                levelId: { type: 'string' },
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
              progressId: { type: 'string' },
              userId: { type: 'string', format: 'uuid' },
              version: { type: 'integer' },
              updatedAt: { type: 'string', format: 'date-time' },
              completedLevels: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    levelId: { type: 'string' },
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
      LevelDefinitionDto: {
        type: 'object',
        required: ['arrows', 'attempts'],
        properties: {
          arrows: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/ArrowSpec' } },
          attempts: { type: 'integer', minimum: 1 },
        },
      },
      CreateLevelRequest: {
        type: 'object',
        required: ['name', 'description', 'difficulty', 'arrows'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
          arrows: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/ArrowSpec' } },
          attempts: { type: 'integer', minimum: 1, nullable: true },
          timeLimit: { type: 'integer', minimum: 1, nullable: true },
          moveCount: { type: 'integer', minimum: 1, nullable: true },
        },
      },
      UpdateLevelDefinitionRequest: {
        type: 'object',
        required: ['arrows'],
        properties: {
          arrows: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/ArrowSpec' } },
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
        required: ['levelId', 'name', 'difficulty', 'createdAt'],
        properties: {
          levelId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
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
            required: ['leaderboardId', 'levelId', 'entries', 'updatedAt'],
            properties: {
              leaderboardId: { type: 'string', format: 'uuid' },
              levelId: { type: 'string' },
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
