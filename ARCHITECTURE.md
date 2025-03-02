# Architecture Documentation

## System Architecture

```mermaid
graph TB
    subgraph Frontend
        React[React App]
        Socket[Socket.IO Client]
        Router[React Router]
    end
    
    subgraph Backend
        Express[Express Server]
        SocketIO[Socket.IO Server]
        Redis[Redis]
        GPT4[GPT-4 API]
    end
    
    React --> Socket
    Socket --> SocketIO
    React --> Router
    Express --> SocketIO
    SocketIO --> Redis
    Express --> GPT4
    Express --> Redis
```

## Component Hierarchy

```mermaid
graph TD
    App[App.js] --> Router[React Router]
    Router --> Reg[RegistrationForm]
    Router --> GM[GameMasterView]
    Router --> GS[GameShowView]
    Router --> PV[PlayerView]
    
    GM --> PS[PlayerStatus]
    GM --> RS[ResponseStatus]
    
    GS --> PS
    GS --> RS
    
    PV --> PS
```

## Data Flow

```mermaid
sequenceDiagram
    participant Player
    participant GM as Game Master
    participant Frontend
    participant Backend
    participant Redis
    participant GPT4

    GM->>Backend: Start Game
    Backend->>GPT4: Generate Questions
    GPT4-->>Backend: Questions Generated
    Backend->>Redis: Store Game State
    Backend-->>Frontend: Game Started Event
    
    Player->>Frontend: Register
    Frontend->>Backend: Register Player
    Backend->>Redis: Store Player
    Backend-->>Frontend: Player Registered Event
    
    Player->>Frontend: Submit Answer
    Frontend->>Backend: Process Answer
    Backend->>Redis: Update Scores
    Backend-->>Frontend: Round Complete Event
```

## State Management

```mermaid
stateDiagram-v2
    [*] --> NotStarted
    NotStarted --> InProgress: Start Game
    InProgress --> QuestionActive: Next Question
    QuestionActive --> AnswersReceived: All Answered
    AnswersReceived --> QuestionActive: Next Question
    AnswersReceived --> GameOver: Last Question
    GameOver --> [*]
```

## WebSocket Communication

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Redis
    
    Client->>Server: Connect
    Server->>Redis: Get Game State
    Redis-->>Server: Current State
    Server-->>Client: Reconnect State
    
    Client->>Server: Join Game Instance
    Server->>Redis: Update Instance
    Server-->>Client: Instance State
    
    Note over Client,Server: Real-time Events
    
    Server-->>Client: Game Started
    Server-->>Client: New Question
    Server-->>Client: Player Answered
    Server-->>Client: Round Complete
    Server-->>Client: Game Over
```

## Redis Data Model

```mermaid
erDiagram
    GAME_INSTANCE ||--o{ PLAYER : contains
    GAME_INSTANCE {
        string instanceId
        boolean gameStarted
        array questions
        int currentQuestion
        object scores
    }
    PLAYER {
        string githubHandle
        datetime joinedAt
        object answers
        int score
    }
    GAME_INSTANCE ||--o{ QUESTION : has
    QUESTION {
        string id
        string question
        array options
        string correctAnswer
    }
```

## Deployment Architecture

```mermaid
graph TB
    subgraph Production
        NX[Nginx]
        APP1[App Server 1]
        APP2[App Server 2]
        RD[(Redis)]
        LB[Load Balancer]
    end
    
    Client-->LB
    LB-->NX
    NX-->APP1
    NX-->APP2
    APP1-->RD
    APP2-->RD
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Error Occurs] --> B{Error Type}
    B -->|Validation| C[HTTP 400]
    B -->|State| D[HTTP 409]
    B -->|Auth| E[HTTP 401]
    B -->|Server| F[HTTP 500]
    
    C --> G[Error Response]
    D --> G
    E --> G
    F --> G
    
    G --> H[Client Handler]
    H --> I{Action}
    I -->|Retry| J[Retry Request]
    I -->|Notify| K[Show Error]
    I -->|Redirect| L[Auth Page]
```