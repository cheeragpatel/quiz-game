/**
 * Configuration settings for the Quiz Game application
 */

export const PORT = process.env.PORT || 3001;

// Redis configuration
export const REDIS_CONFIG = {
  url: process.env.REDIS_URL || 'redis://redis:6379',
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
};

// Game configuration
export const GAME_CONFIG = {
  defaultTotalQuestions: 10,
  instanceCleanupAgeHours: 24
};

export default {
  PORT,
  REDIS_CONFIG,
  GAME_CONFIG
};