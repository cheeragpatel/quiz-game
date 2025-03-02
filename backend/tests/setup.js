/**
 * Global test setup configuration for Jest
 */
import { jest } from '@jest/globals';

// Set a timeout for all tests at 10 seconds
jest.setTimeout(10000);

// Mock environment variables
process.env.PORT = "3001";
process.env.REDIS_URL = "redis://localhost:6379";

// Mock redis-client for all tests
jest.mock('../redis/redisClient.js', () => {
  return {
    redisClient: {
      isOpen: true,
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      sAdd: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
      sRem: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([])
    },
    connectRedis: jest.fn().mockResolvedValue({}),
    setupSocketIORedisAdapter: jest.fn().mockResolvedValue({}),
    clearSocketSessions: jest.fn().mockResolvedValue({})
  };
});

// Global beforeEach and afterEach hooks
beforeEach(() => {
  // Any setup that needs to happen before each test
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});