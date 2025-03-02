# Deployment Guide

This guide covers deployment options and configurations for the Quiz Game application.

## Local Development

### Prerequisites
- Node.js 16+
- Redis server 6+
- OpenAI API key
- GitHub OAuth credentials

### Steps
1. Install dependencies:
   ```bash
   npm run setup
   ```

2. Configure environment variables:
   ```bash
   # Required variables
   NODE_ENV=development
   PORT=3001
   OPENAI_API_KEY=your_key_here
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   REDIS_URL=redis://localhost:6379
   
   # Optional variables
   LOG_LEVEL=debug
   CORS_ORIGIN=http://localhost:3000
   MAX_PLAYERS=50
   QUESTION_TIMEOUT=30000
   ```

3. Start Redis server:
   ```bash
   redis-server
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

## Docker Deployment

### Production
```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3001
      - REDIS_URL=redis://redis:6379
    ports:
      - "3001:3001"
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis_data:
```

### Development
```yaml
version: '3.8'
services:
  dev:
    build:
      context: .
      target: development
    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
    ports:
      - "3000:3000"
      - "3001:3001"
    command: npm run dev
```

## Cloud Deployments

### Heroku

1. Create application:
   ```bash
   heroku create your-quiz-game
   ```

2. Add Redis add-on:
   ```bash
   heroku addons:create heroku-redis:hobby-dev
   ```

3. Configure environment:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set OPENAI_API_KEY=your_key
   heroku config:set GITHUB_CLIENT_ID=your_client_id
   heroku config:set GITHUB_CLIENT_SECRET=your_client_secret
   ```

4. Deploy:
   ```bash
   git push heroku main
   ```

### AWS Elastic Beanstalk

1. Initialize EB CLI:
   ```bash
   eb init quiz-game --platform node.js
   ```

2. Create environment:
   ```bash
   eb create quiz-game-env
   ```

3. Configure environment variables in EB Console or using:
   ```bash
   eb setenv NODE_ENV=production \
            OPENAI_API_KEY=your_key \
            REDIS_URL=your_redis_url
   ```

4. Deploy:
   ```bash
   eb deploy
   ```

### Digital Ocean App Platform

1. Create app from GitHub repository
2. Add Redis database
3. Configure environment variables
4. Enable auto-deploy

## Environment Variables

### Required Variables
- `NODE_ENV`: production/development
- `PORT`: Server port (default: 3001)
- `OPENAI_API_KEY`: OpenAI API key
- `REDIS_URL`: Redis connection URL
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret

### Optional Variables
- `LOG_LEVEL`: debug/info/warn/error
- `CORS_ORIGIN`: Allowed CORS origin
- `MAX_PLAYERS`: Maximum players per game
- `QUESTION_TIMEOUT`: Question timeout in ms
- `REDIS_PREFIX`: Prefix for Redis keys

## SSL/TLS Configuration

### Using Nginx

```nginx
server {
    listen 443 ssl;
    server_name your-quiz-game.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Auto-renewal with Certbot
```bash
certbot --nginx -d your-quiz-game.com
```

## Monitoring

### Application Monitoring

1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Start with PM2:
   ```bash
   pm2 start npm --name "quiz-game" -- start
   ```

3. Monitor logs:
   ```bash
   pm2 logs quiz-game
   ```

### Health Checks

Add to your monitoring service:
- `/health`: Basic health check
- `/health/redis`: Redis connection check
- `/health/deep`: Deep health check

## Backup

### Redis Backup

1. Configure persistence:
   ```
   # redis.conf
   appendonly yes
   appendfsync everysec
   ```

2. Automated backup script:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/backup/redis"
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   redis-cli SAVE
   cp /var/lib/redis/dump.rdb "$BACKUP_DIR/dump_$TIMESTAMP.rdb"
   ```

3. Schedule with cron:
   ```
   0 */6 * * * /path/to/backup-redis.sh
   ```

## Security Considerations

1. Enable rate limiting:
   ```javascript
   app.use(rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   }));
   ```

2. Configure CORS properly:
   ```javascript
   app.use(cors({
     origin: process.env.CORS_ORIGIN,
     credentials: true
   }));
   ```

3. Set secure headers:
   ```javascript
   app.use(helmet());
   ```

4. Secure Redis:
   ```
   # redis.conf
   requirepass your_strong_password
   bind 127.0.0.1
   ```

5. Enable request validation:
   ```javascript
   app.use(express.json({ limit: '10kb' }));
   ```