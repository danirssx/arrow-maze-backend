import { openApiSpec } from '../../../src/framework/swagger/openApiSpec.js';

// @s9 — OpenAPI documents the optional board shape (Option A).

type SchemaShape = { properties?: Record<string, unknown> };
type RequiredSchemaShape = SchemaShape & { required?: string[] };

const schemas = openApiSpec.components.schemas as unknown as Record<string, SchemaShape>;

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
