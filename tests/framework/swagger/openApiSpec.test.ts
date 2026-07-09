import { openApiSpec } from '../../../src/framework/swagger/openApiSpec.js';

// @s9 — OpenAPI documents the optional board shape (Option A).

type SchemaShape = { properties?: Record<string, unknown> };
type RequiredSchemaShape = SchemaShape & { required?: string[] };
type OperationShape = {
  security?: unknown;
  parameters?: Array<{ name?: string }>;
  responses?: Record<string, unknown>;
};

const schemas = openApiSpec.components.schemas as unknown as Record<string, SchemaShape>;
const paths = openApiSpec.paths as unknown as Record<string, { get?: OperationShape }>;

describe('openApiSpec board shape', () => {
  it('should_define_a_board_shape_input_schema', () => {
    const boardShape = schemas['BoardShapeInput'];
    expect(boardShape).toBeDefined();
    expect(boardShape?.properties?.['type']).toBeDefined();
    expect(boardShape?.properties?.['cells']).toBeDefined();
  });

  it('should_include_optional_board_shape_in_create_level_request', () => {
    expect(schemas['CreateLevelRequest']?.properties?.['boardShape']).toBeDefined();
  });

  it('should_include_optional_board_shape_in_level_definition_dto', () => {
    expect(schemas['LevelDefinitionDto']?.properties?.['boardShape']).toBeDefined();
  });
});

describe('openApiSpec leaderboard submit contract', () => {
  it('should_document_only_gameplay_fields_as_submit_score_request_input', () => {
    const submitScore = schemas['SubmitScoreRequest'] as RequiredSchemaShape;

    expect(submitScore.required).toEqual(['levelId', 'score', 'timeSeconds', 'movesCount']);
    expect(submitScore.properties?.['levelId']).toBeDefined();
    expect(submitScore.properties?.['score']).toBeDefined();
    expect(submitScore.properties?.['timeSeconds']).toBeDefined();
    expect(submitScore.properties?.['movesCount']).toBeDefined();
    expect(submitScore.properties?.['leaderboardId']).toBeUndefined();
    expect(submitScore.properties?.['entryId']).toBeUndefined();
    expect(submitScore.properties?.['userId']).toBeUndefined();
    expect(submitScore.properties?.['usernameSnapshot']).toBeUndefined();
  });
});

describe('openApiSpec admin read endpoints', () => {
  it('should_document_admin_levels_with_bearer_auth_and_status_filter', () => {
    const operation = paths['/admin/levels']?.get;

    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([{ bearerAuth: [] }]);
    expect(operation?.parameters?.some((parameter) => parameter.name === 'status')).toBe(true);
    expect(operation?.responses?.['200']).toBeDefined();
    expect(schemas['AdminLevelSummary']?.properties?.['status']).toBeDefined();
  });

  it('should_document_admin_users_with_bearer_auth_pagination_and_no_password_hash', () => {
    const operation = paths['/admin/users']?.get;

    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([{ bearerAuth: [] }]);
    expect(operation?.parameters?.some((parameter) => parameter.name === 'page')).toBe(true);
    expect(operation?.parameters?.some((parameter) => parameter.name === 'limit')).toBe(true);
    expect(operation?.responses?.['200']).toBeDefined();
    expect(JSON.stringify(operation)).not.toContain('passwordHash');
    expect(JSON.stringify(schemas['AdminUserListResponse'])).not.toContain('passwordHash');
  });
});
