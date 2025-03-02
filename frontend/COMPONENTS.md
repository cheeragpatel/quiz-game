# Frontend Components Documentation

## Core Components

### App.js
Main application component that handles routing and global state.

**State:**
- `currentQuestion`: Current active question
- `gameStatus`: Game status ('not started', 'started', 'ended')

**Routes:**
- `/`: Registration page
- `/game-master`: Game master controls
- `/game-show`: Game show display
- `/player`: Player view

### RegistrationForm.js
Player registration component using GitHub handles.

**Props:**
- None

**State:**
- `githubHandle`: Player's GitHub username
- `registrationStatus`: Status of registration attempt

### GameMasterView.js
Control panel for game masters to manage the quiz.

**Props:**
- `setCurrentQuestion`: Function to update current question
- `setGameStatus`: Function to update game status

**State:**
- `topics`: Array of selected topics
- `numQuestions`: Number of questions for the game
- `players`: Array of registered players

### GameShowView.js
Large display view showing current game state.

**Props:**
- None

**State:**
- `currentQuestion`: Current question being displayed
- `scores`: Current player scores
- `hostQuip`: Virtual host's current message
- `answeredPlayers`: Players who have answered

### PlayerView.js
Individual player's game interface.

**Props:**
- `currentQuestion`: Current question object
- `gameStatus`: Current game status

**State:**
- `selectedAnswer`: Player's selected answer
- `answerSubmitted`: Whether answer has been submitted
- `score`: Player's current score

## Supporting Components

### PlayerStatus.js
Displays player status and score.

**Props:**
- `player`: Player object with score and status
- `isAnswered`: Whether player has answered current question

### ResponseStatus.js
Shows the status of player responses.

**Props:**
- `responses`: Object containing player responses
- `totalPlayers`: Total number of players
- `showAnswers`: Whether to show correct/incorrect

## Socket Event Handlers

### useSocketHandlers.js
Custom hook for managing socket.io events.

**Parameters:**
- `gameInstanceId`: Current game instance ID

**Events Handled:**
- Connection/disconnection
- Game state updates
- Player actions
- Host messages

## Utility Components

### ErrorBoundary.js
React error boundary for graceful error handling.

**Props:**
- `children`: Child components to wrap
- `fallback`: Optional custom error UI

### LoadingSpinner.js
Loading indicator for async operations.

**Props:**
- `size`: Size of spinner ('small', 'medium', 'large')
- `color`: Custom color (optional)

### Toast.js
Notification component for game events.

**Props:**
- `message`: Message to display
- `type`: Type of toast ('success', 'error', 'info')
- `duration`: How long to show toast

## Styles

### GameShowTheme.css
Global styles for game show aesthetic.

**Features:**
- Retro game show color scheme
- Animated transitions
- Responsive layouts
- Font definitions

## State Management

### Socket Context
Provides socket.io instance throughout the app.

**Properties:**
- `socket`: Socket.io client instance
- `connected`: Connection status
- `gameInstanceId`: Current game instance ID

### Game Context
Manages global game state.

**Properties:**
- `gameState`: Current game state
- `dispatch`: State update function
- `players`: Connected players
- `scores`: Current scores