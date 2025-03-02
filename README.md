# Quiz Game

A multiplayer quiz game with a retro 70's game show aesthetic, powered by GPT-4. Features dynamic question generation, real-time multiplayer support, and a virtual host (Mona Woolery) that provides witty commentary.

## Features

- 🤖 GPT-4 powered question generation across various topics
- 🎮 Real-time multiplayer gameplay using Socket.IO
- 🎭 GitHub-based player registration with avatar integration
- 🎙️ Virtual host (Mona Woolery) providing dynamic commentary
- 📊 Live score tracking and leaderboard
- 🎯 Configurable game settings (number of questions, topics)
- 💾 Persistent game state with Redis
- 🏆 Round-by-round winner celebrations

## Tech Stack

- **Frontend**: React, Socket.IO Client
- **Backend**: Express.js, Socket.IO
- **State Management**: Redis
- **AI Integration**: OpenAI GPT-4
- **Authentication**: GitHub API integration
- **Deployment**: Docker support

## Documentation

- [API Documentation](backend/API.md)
- [Component Documentation](frontend/COMPONENTS.md)
- [Frontend README](frontend/README.md)

## Quick Start

### Prerequisites

- Node.js 16+
- Redis server
- OpenAI API key
- GitHub API access

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cheeragpatel/quiz-game.git
   cd quiz-game
   ```

2. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install
   ```

3. Set up environment variables:
   ```bash
   # Create .env file
   cp .env.example .env
   # Add your OpenAI API key
   ```

4. Start Redis server:
   ```bash
   redis-server
   ```

5. Start the development servers:
   ```bash
   npm start
   ```

### Docker Deployment

1. Build and run using Docker Compose:
   ```bash
   docker-compose up --build
   ```

## Game Setup

### As a Game Master:

1. Navigate to /game-master
2. Configure game settings:
   - Number of questions
   - Topics (comma-separated)
3. Use control panel to:
   - Start/end game
   - Advance to next question
   - Monitor player responses

### As a Player:

1. Navigate to root URL
2. Enter GitHub handle
3. Wait for game master to start
4. Answer questions when prompted
5. View scores and celebrations

### Game Show Display:

1. Navigate to /game-show
2. Display automatically shows:
   - Current question
   - Player avatars
   - Scores
   - Host commentary

## Architecture

### Backend Services

- Question Generation Service (GPT-4)
- Virtual Host Service (GPT-4)
- Game State Management
- Real-time Communication
- Player Authentication

### Frontend Components

- Game Master Interface
- Player Interface
- Game Show Display
- Registration System
- Real-time Updates

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- OpenAI for GPT-4 API
- GitHub for authentication API
- Socket.IO for real-time capabilities
- Redis for state management

