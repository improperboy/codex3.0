import { describe, it, expect } from 'vitest';

describe('Simple Test Suite', () => {
  it('should pass a basic truthy test', () => {
    expect(true).toBe(true);
  });

  it('should perform basic math correctly', () => {
    expect(1 + 1).toBe(2);
    expect(5 * 5).toBe(25);
  });
});
