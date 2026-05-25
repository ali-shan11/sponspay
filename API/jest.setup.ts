import { Logger } from '@nestjs/common';

// Mock the NestJS Logger to suppress console output during tests
beforeAll(() => {
  // Mock all Logger methods to prevent console output during tests
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
  
  // Also mock static Logger methods
  jest.spyOn(Logger, 'log').mockImplementation(() => {});
  jest.spyOn(Logger, 'error').mockImplementation(() => {});
  jest.spyOn(Logger, 'warn').mockImplementation(() => {});
  jest.spyOn(Logger, 'debug').mockImplementation(() => {});
  jest.spyOn(Logger, 'verbose').mockImplementation(() => {});
});

// Suppress console methods that might be used directly
beforeAll(() => {
  // Store original console methods in case we need them for debugging
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
  };

  // Mock console methods to reduce noise during tests
  // Only suppress if not in debug mode
  if (!process.env.JEST_DEBUG) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
  }

  // Make original console methods available for debugging if needed
  (global as any).originalConsole = originalConsole;
});

// Clean up after all tests
afterAll(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
});
