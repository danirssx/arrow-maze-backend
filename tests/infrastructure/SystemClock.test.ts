import { SystemClock } from '../../src/infrastructure/shared/SystemClock.js';

describe('SystemClock', () => {
  const clock = new SystemClock();

  it('should_return_a_Date_instance_when_now_is_called', () => {
    // Arrange — (instance created above)

    // Act
    const result = clock.now();

    // Assert
    expect(result).toBeInstanceOf(Date);
  });

  it('should_return_a_date_close_to_current_time_when_now_is_called', () => {
    // Arrange
    const before = Date.now();

    // Act
    const result = clock.now();

    // Assert
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });
});
