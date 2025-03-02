# Deployment Guide

This guide covers different deployment options for the Quiz Game application.

## Local Development

### Prerequisites
- Node.js 16+
- Redis server
- OpenAI API key

### Steps
1. Run setup script:
   ```bash
   npm run setup
   ```
2. Start in development mode:
   ```bash
   npm run dev
   ```

## Docker Deployment

### Production
1. Build and start the production containers:
   ```bash
   docker-compose up --build app
   ```

### Development
1. Start the development environment:
   ```bash
   docker-compose up dev
   ```

## Cloud Deployment

### Heroku

1. Create a new Heroku app:
   ```bash
   heroku create your-quiz-game
   ```

2. Add Redis add-on:
   ```bash
   heroku addons:create heroku-redis:hobby-dev
   ```

3. Configure environment variables:
   ```bash
   heroku config:set OPENAI_API_KEY=your_key
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

3. Configure environment variables in EB Console

4. Deploy:
   ```bash
   eb deploy
   ```

## Environment Variables

Ensure these variables are set in your deployment environment:

- `PORT`: Server port (default: 3001)
- `OPENAI_API_KEY`: Your OpenAI API key
- `REDIS_URL`: Redis connection URL
- `NODE_ENV`: production/development

## SSL/TLS Configuration

For production deployments, configure SSL:

1. Obtain SSL certificate
2. Update nginx/apache configuration
3. Enable HTTPS in Express

## Monitoring

- Use PM2 for process management
- Configure application logging
- Set up health checks
- Monitor Redis connection

## Backup

1. Configure Redis persistence
2. Set up regular backups
3. Implement state recovery

## Security Considerations

- Enable rate limiting
- Implement input validation
- Secure Redis instance
- Configure CORS properly
- Use secure WebSocket connections