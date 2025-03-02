# Quiz Game API Documentation

## Headers

All API requests should include:
- `Content-Type: application/json`
- `x-game-instance-id`: (optional) The game instance ID

## Game Instance Management

### Create Game Instance
- **POST** `/api/instances`
- Creates a new game instance
```json
{
  "name": "Game Room 1"
}
```

### List Game Instances
- **GET** `/api/instances`
- Returns list of active game instances

### Switch Game Instance
- **POST** `/api/instances/switch`
- Switch to a different game instance
```json
{
  "instanceId": "instance-123"
}
```

## Game Management

### Start Game
- **POST** `/api/startGame`
- Starts a new quiz game with specified settings
```json
{
  "numQuestions": 10,
  "topics": ["science", "history"],
  "instanceId": "instance-123"
}
```

### End Game
- **POST** `/api/endGame`
- Ends the current game and calculates final scores
```json
{
  "instanceId": "instance-123"
}
```

### Next Question
- **POST** `/api/nextQuestion`
- Advances to the next question in the game
```json
{
  "instanceId": "instance-123"
}
```

### Get Current Question
- **GET** `/api/currentQuestion`
- Retrieves the current active question
- Query Parameters:
  - `instanceId`: (optional) Game instance ID

## Player Management

### Register Player
- **POST** `/api/register`
- Registers a new player with their GitHub handle
```json
{
  "githubHandle": "username",
  "instanceId": "instance-123"
}
```

### Get Players
- **GET** `/api/players`
- Returns list of all registered players in an instance
- Query Parameters:
  - `instanceId`: (optional) Game instance ID

### Submit Answer
- **POST** `/api/submitAnswer`
- Submit a player's answer for the current question
```json
{
  "playerName": "username",
  "answer": "selected answer",
  "instanceId": "instance-123"
}
```

### Get Player Score
- **GET** `/api/players/:githubHandle/score`
- Get the current score for a specific player

## Game Show Host

### Welcome Quip
- **GET** `/api/welcomeQuip`
- Get a welcome message from the virtual host
- Query Parameters:
  - `instanceId`: (optional) Game instance ID

### Generate Quip
- **POST** `/api/generateQuip`
- Generate a custom quip from the virtual host
```json
{
  "prompt": "context for the quip",
  "instanceId": "instance-123"
}
```

### Introduction Quip
- **GET** `/api/introductionQuip`
- Get an introduction message from the virtual host

### Goodbye Quip
- **GET** `/api/goodbyeQuip`
- Get a farewell message from the virtual host

## WebSocket Events

### Server → Client Events
- `gameStarted`: Emitted when a new game starts
  ```json
  {
    "currentQuestion": {},
    "introQuip": "string",
    "welcomeQuip": "string"
  }
  ```
- `newQuestion`: Emitted when moving to next question
  ```json
  {
    "question": {},
    "hostQuip": "string"
  }
  ```
- `playerAnswered`: Emitted when a player submits an answer
  ```json
  {
    "playerName": "string",
    "hasAnswered": true
  }
  ```
- `roundComplete`: Emitted when all players have answered
  ```json
  {
    "scores": {},
    "correctAnswer": "string",
    "hostQuip": "string"
  }
  ```
- `gameOver`: Emitted when the game ends
  ```json
  {
    "winners": [],
    "finalScores": {},
    "goodbyeQuip": "string"
  }
  ```
- `playerRegistered`: Emitted when a new player registers
  ```json
  {
    "player": {
      "githubHandle": "string",
      "joinedAt": "timestamp"
    }
  }
  ```
- `reconnectState`: Emitted when a client reconnects
  ```json
  {
    "gameStarted": boolean,
    "currentQuestion": {},
    "players": [],
    "scores": {}
  }
  ```
- `instancePlayerCount`: Emitted when player count changes in an instance
  ```json
  {
    "count": number,
    "instanceId": "string"
  }
  ```

### Client → Server Events
- `reconnectStateRequest`: Request current game state on reconnection
  ```json
  {
    "instanceId": "string"
  }
  ```
- `joinGameInstance`: Join a specific game instance
  ```json
  {
    "instanceId": "string"
  }
  ```

## Error Responses
All error responses follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```