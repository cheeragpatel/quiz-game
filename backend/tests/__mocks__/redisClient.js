// Mock for redis client
export const redisClient = {
  isOpen: true,
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  sAdd: jest.fn().mockResolvedValue(1),
  sMembers: jest.fn().mockResolvedValue([]),
  sRem: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([])
};

export const connectRedis = jest.fn().mockResolvedValue({});
export const setupSocketIORedisAdapter = jest.fn().mockResolvedValue({});
export const clearSocketSessions = jest.fn().mockResolvedValue({});