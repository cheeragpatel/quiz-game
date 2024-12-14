# quiz-game

## Overview

This is a quiz game webapp that dynamically generates questions using GPT-4o. Players can register using their GitHub handles and avatars. The game show view displays the current questions, a progress bar for responses, and shows the winner with a game show host styled quip. The game master view has controls to start/end the game, move to the next question, and configure the number of questions. The virtual host is powered by GPT-4o and dynamically hosts the game in the style of a 70s game show host.

## Features

- Dynamic question generation using GPT-4o
- Player registration with GitHub handles and avatars
- Game show view with current questions, progress bar, and winner display
- Game master view with controls to manage the game flow
- Virtual host powered by GPT-4o

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/cheeragpatel/quiz-game.git
   ```
2. Navigate to the project directory:
   ```
   cd quiz-game
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage

### Player Registration

1. Open the webapp in your browser.
2. Navigate to the registration page.
3. Enter your GitHub handle and submit the form.
4. Your GitHub avatar will be displayed as your profile picture.

### Game Master View

1. Open the webapp in your browser.
2. Navigate to the game master view.
3. Use the controls to start/end the game and move to the next question.
4. Configure the number of questions using the provided user interface element (text box or dropdown menu).

### Game Show View

1. Open the webapp in your browser.
2. Navigate to the game show view.
3. The current question and a progress bar for responses will be displayed.
4. Once everyone has responded, the winner will be shown with a game show host styled quip.
5. The game will then move to the next question.
6. At the end, the scores will be tallied, and the winner will be displayed.

## Implementation

### Backend

- `backend/questionGenerator.js`: Interacts with GPT-4o for question generation and fetches questions based on nerdy/geeky pop culture references.
- `backend/virtualHost.js`: Implements a virtual host function using GPT-4o for dynamic hosting.

### Frontend

- `frontend/registrationForm.js`: Implements a registration form that accepts GitHub handles and fetches/displays GitHub avatars as profile pictures.
- `frontend/gameShowView.js`: Implements a game show view with dynamic question display, progress bar, and winner display with a quip using GPT-4o.
- `frontend/gameMasterView.js`: Adds controls for the game master to start/end the game, move to the next question, and set the number of questions.

## Running in a GitHub Codespace

1. Open the repository in a GitHub Codespace.
2. Follow the installation steps to set up the project.
3. Start the development server:
   ```
   npm start
   ```
4. Open the webapp in the Codespace browser.

## Access Instructions

### Users

1. Open the webapp in your browser.
2. Navigate to the registration page.
3. Enter your GitHub handle and submit the form.
4. Your GitHub avatar will be displayed as your profile picture.

### Game Master

1. Open the webapp in your browser.
2. Navigate to the game master view.
3. Use the controls to start/end the game and move to the next question.
4. Configure the number of questions using the provided user interface element (text box or dropdown menu).

## Starting the Combined Server

1. Ensure you have installed all dependencies by running `npm install` in the root directory.
2. Start the combined server using the following command:
   ```
   npm start
   ```
3. The frontend and backend servers will run simultaneously.

