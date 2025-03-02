# Frontend Components Documentation

## Views

### GameMasterView
- **Purpose**: Control interface for managing the quiz game
- **Props**:
  - `setCurrentQuestion`: Function to update current question
  - `setGameStatus`: Function to update game status
  - `gameStatus`: Current game status
- **State Management**:
  - Game configuration (number of questions, topics)
  - Player tracking and scores
  - Round winners and quips
  - Response tracking

### GameShowView
- **Purpose**: Main display for the quiz game show
- **Features**:
  - Welcome and introduction sequences
  - Question display
  - Player avatars and scores
  - Winner celebrations
  - Host quips
  - Progress tracking

### PlayerView
- **Purpose**: Interface for individual players to participate
- **Features**:
  - Answer submission
  - Score tracking
  - Game status updates
  - Round results

### RegistrationForm
- **Purpose**: Player registration with GitHub integration
- **Features**:
  - GitHub handle input
  - Avatar fetching
  - Session management

## Helper Components

### PlayerStatus
- **Purpose**: Display player information and status
- **Props**:
  - `players`: Array of player objects
  - `responseStatus`: Object tracking player responses

### ResponseStatus
- **Purpose**: Track and display answer submission status
- **Props**:
  - `players`: Array of player objects
  - `responseStatus`: Object tracking player responses

## State Management

### App Level
- Game status
- Current question
- Socket connections

### GameMaster Level
- Game configuration
- Player management
- Round control

### Player Level
- Answer submission
- Score tracking
- Game progress

## Styling

All components use the shared GameShowTheme.css for consistent retro game show styling.