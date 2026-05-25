import { NumberFormatPipe } from './number-format.pipe';

describe('NumberFormatPipe (pipes directory)', () => {
  let pipe: NumberFormatPipe;

  beforeEach(() => {
    pipe = new NumberFormatPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  // ---- Null / undefined / zero (falsy) handling ----

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return "0" for 0', () => {
    expect(pipe.transform(0)).toBe('0');
  });

  // ---- Values below 1000 ----

  it('should return number as string for values under 1000', () => {
    expect(pipe.transform(1)).toBe('1');
    expect(pipe.transform(42)).toBe('42');
    expect(pipe.transform(999)).toBe('999');
  });

  it('should return number as string for value of 500', () => {
    expect(pipe.transform(500)).toBe('500');
  });

  // ---- Values in thousands (K) ----

  it('should format 1000 as 1.0K', () => {
    expect(pipe.transform(1000)).toBe('1.0K');
  });

  it('should format 1500 as 1.5K', () => {
    expect(pipe.transform(1500)).toBe('1.5K');
  });

  it('should format 10000 as 10.0K', () => {
    expect(pipe.transform(10000)).toBe('10.0K');
  });

  it('should format 999999 as 1000.0K (edge case near million)', () => {
    expect(pipe.transform(999999)).toBe('1000.0K');
  });

  it('should format 250000 as 250.0K', () => {
    expect(pipe.transform(250000)).toBe('250.0K');
  });

  // ---- Values in millions (M) ----

  it('should format 1000000 as 1.0M', () => {
    expect(pipe.transform(1000000)).toBe('1.0M');
  });

  it('should format 1500000 as 1.5M', () => {
    expect(pipe.transform(1500000)).toBe('1.5M');
  });

  it('should format 10000000 as 10.0M', () => {
    expect(pipe.transform(10000000)).toBe('10.0M');
  });

  it('should format 999999999 as 1000.0M (edge case near billion)', () => {
    expect(pipe.transform(999999999)).toBe('1000.0M');
  });

  // ---- Values in billions (B) ----

  it('should format 1000000000 as 1.0B', () => {
    expect(pipe.transform(1000000000)).toBe('1.0B');
  });

  it('should format 2500000000 as 2.5B', () => {
    expect(pipe.transform(2500000000)).toBe('2.5B');
  });

  it('should format 10000000000 as 10.0B', () => {
    expect(pipe.transform(10000000000)).toBe('10.0B');
  });

  // ---- Decimal precision ----

  it('should show one decimal place for K values', () => {
    const result = pipe.transform(1234);
    expect(result).toBe('1.2K');
  });

  it('should show one decimal place for M values', () => {
    const result = pipe.transform(1234567);
    expect(result).toBe('1.2M');
  });

  it('should show one decimal place for B values', () => {
    const result = pipe.transform(1234567890);
    expect(result).toBe('1.2B');
  });
});
