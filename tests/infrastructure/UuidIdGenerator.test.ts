import { UuidIdGenerator } from '../../src/infrastructure/shared/UuidIdGenerator.js';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('UuidIdGenerator', () => {
  const generator = new UuidIdGenerator();

  it('should_return_valid_uuid_v4_when_generate_is_called', () => {
    // Arrange — (instance created above)

    // Act
    const id = generator.generate();

    // Assert
    expect(typeof id).toBe('string');
    expect(UUID_V4_REGEX.test(id)).toBe(true);
  });

  it('should_return_unique_values_on_successive_calls', () => {
    // Arrange / Act
    const id1 = generator.generate();
    const id2 = generator.generate();

    // Assert
    expect(id1).not.toBe(id2);
  });
});
