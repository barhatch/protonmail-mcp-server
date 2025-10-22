import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should create logger instance', () => {
    const logger = new Logger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should log info message', () => {
    const logger = new Logger();
    logger.info('Test message', 'TestContext');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      ''
    );
  });

  it('should log warning message', () => {
    const logger = new Logger();
    logger.warn('Test warning', 'TestContext');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]'),
      ''
    );
  });

  it('should log error message', () => {
    const logger = new Logger();
    const error = new Error('Test error');
    logger.error('Test error', 'TestContext', error);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      error
    );
  });

  it('should log debug message when debug mode is enabled', () => {
    const logger = new Logger();
    logger.setDebugMode(true);
    logger.debug('Test debug', 'TestContext');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      ''
    );
  });

  it('should not log debug message when debug mode is disabled', () => {
    const logger = new Logger();
    logger.debug('Test debug', 'TestContext');

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should include context in log message', () => {
    const logger = new Logger();
    logger.info('Test message', 'CustomContext');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CustomContext]'),
      ''
    );
  });

  it('should handle optional data parameter', () => {
    const logger = new Logger();
    const data = { key: 'value' };
    logger.info('Test message', 'TestContext', data);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      data
    );
  });

  it('should use default context if not provided', () => {
    const logger = new Logger();
    logger.info('Test message');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[System]'),
      ''
    );
  });
});
