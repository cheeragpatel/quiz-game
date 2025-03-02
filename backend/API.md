# Quiz Game API Documentation

## Game Management

### Start Game
- **POST** `/api/startGame`
- Starts a new quiz game with specified settings
```json
{
  "numQuestions": 10,
  "topics": ["science", "history"]
}
```

### End Game
- **POST** `/api/endGame`
- Ends the current game and calculates final scores

### Next Question
- **POST** `/api/nextQuestion`
- Advances to the next question in the game

### Get Current Question
- **GET** `/api/currentQuestion`
- Retrieves the current active question

## Player Management

### Register Player
- **POST** `/api/register`
- Registers a new player with their GitHub handle
```json
{
  "githubHandle": "username"
}
```

### Get Players
- **GET** `/api/players`
- Returns list of all registered players

### Submit Answer
- **POST** `/api/submitAnswer`
- Submit a player's answer for the current question
```json
{
  "playerName": "username",
  "answer": "selected answer"
}
```

## Game Show Host

### Welcome Quip
- **GET** `/api/welcomeQuip`
- Get a welcome message from the virtual host

### Generate Quip
- **POST** `/api/generateQuip`
- Generate a custom quip from the virtual host
```json
{
  "prompt": "context for the quip"
}
```

### Introduction Quip
- **GET** `/api/introductionQuip`
- Get an introduction message from the virtual host

### Goodbye Quip
- **GET** `/api/goodbyeQuip`
- Get a farewell message from the virtual host

## WebSocket Events

### Server → Client
- `gameStarted`: Emitted when a new game starts
- `newQuestion`: Emitted when moving to next question
- `playerAnswered`: Emitted when a player submits an answer
- `roundComplete`: Emitted when all players have answered
- `gameOver`: Emitted when the game ends
- `playerRegistered`: Emitted when a new player registers
- `reconnectState`: Emitted when a client reconnects

### Client → Server
- `reconnectStateRequest`: Request current game state on reconnection