---
mode: 'agent'
description: 'Use Coding Agent to implement three different UX themes in parallel!'
tools: ['codebase', 'fetch', 'findTestFiles', 'githubRepo', 'openSimpleBrowser', 'problems', 'search', 'searchResults', 'usages', 'add_sub_issue', 'assign_copilot_to_issue', 'create_issue', 'get_issue', 'list_issues', 'list_sub_issues', 'search_issues', 'update_issue', 'github']
---

# Demo: Use Coding Agent to implement multiple UX themes - in parallel!

## Context
This is a demo for GitHub Copilot Coding Agent. UX experimentation can be hard, expensive and take a long time. This demo shows how to use the Coding Agent to implement multiple UX themes in parallel, allowing you to explore different visual and interactive approaches quickly.

## Current State
- The trivia game application has a basic functional interface
- Players can join games, answer questions, and see scores
- The current UI is minimal with basic styling
- Game master can control game flow and see all player responses
- Socket.io handles real-time communication between players and game master

## Demo Goal
Implement three distinct UX themes for the trivia game:
1. **70's Game Show Theme** - Nostalgic, flashy, retro game show aesthetics
2. **Modern Card-Based UI** - Clean, minimal, touch-friendly modern interface  
3. **Trivial Pursuit Style** - Classic board game feel with category-based visuals

## Instructions
1. First analyze the trivia game repository structure and existing components
2. Create an Epic issue in the GitHub repository called "Trivia Game UX Theme Experimentation"
3. Create 3 sub-issues within the Epic for each UX theme implementation
4. Each theme should maintain the same core trivia game functionality while providing a unique visual experience
5. Assign the Copilot Agent to each sub-issue to implement the themes in parallel

### Application Architecture
- Frontend: React application in `/frontend` directory
- Backend: Node.js with Express and Socket.io in `/backend` directory
- Real-time communication for multiplayer trivia gameplay
- Game state management through backend with socket events

### Theme Implementation Specifications

#### Theme 1: 70's Game Show Theme
- **Visual Elements**: Burnt orange, gold, and brown color palette with wood grain textures
- **Animations**: Flashing marquee lights, spinning wheel effects, retro TV screen frames
- **Typography**: Bold, rounded fonts (Cooper Black style)
- **Interactive Elements**: Buzzer sounds, audience applause, disco ball effects
- **Components to Style**: GameShowView, PlayerView, GameMasterView, question displays

#### Theme 2: Modern Card-Based UI  
- **Visual Elements**: Clean whites, soft grays, accent blues with material design cards
- **Animations**: Smooth slide transitions, hover states, ripple effects
- **Typography**: Clean sans-serif fonts (Inter, Helvetica Neue)
- **Interactive Elements**: Touch-friendly cards, micro-interactions, progress indicators
- **Components to Style**: All game components with card-based layouts

#### Theme 3: Trivial Pursuit Style
- **Visual Elements**: Classic pie colors, board game textures, category-based coloring
- **Animations**: Dice roll effects, pie wheel spinning, wedge-shaped selections
- **Typography**: Serif fonts (Georgia, Times) for classic feel
- **Interactive Elements**: Category wheels, trophy animations, pie piece collection
- **Components to Style**: Question categories, scoring display, game board elements

## Success Criteria
After implementation, each theme should provide:
1. **Functional Compatibility**: All core trivia game features work identically across themes
2. **Visual Distinction**: Each theme offers a unique and immersive visual experience
3. **Responsive Design**: Themes work well on mobile, tablet, and desktop devices
4. **Theme Switching**: Users can switch between themes via a theme selector
5. **Consistent UX**: Navigation and game flow remain intuitive across all themes
6. **Performance**: Themes load quickly and animations are smooth
7. **Accessibility**: Each theme meets basic accessibility standards

## Implementation Instructions for Each Sub-Issue

### Sub-Issue 1: 70's Game Show Theme Implementation
1. Create theme-specific CSS files with retro styling
2. Add wood grain textures and warm color palette
3. Implement flashing light animations and retro transitions
4. Add sound effects for buzzes, bells, and applause
5. Style all game components with game show aesthetics
6. Test theme switching and responsive behavior

### Sub-Issue 2: Modern Card-Based UI Implementation  
1. Create clean, minimal CSS with card-based layouts
2. Implement smooth animations and hover effects
3. Add touch-friendly interactions for mobile devices
4. Style components with material design principles
5. Ensure proper spacing and typography hierarchy
6. Test across different screen sizes

### Sub-Issue 3: Trivial Pursuit Style Implementation
1. Create board game inspired styling with category colors
2. Implement pie wheel and dice roll animations
3. Add classic serif typography and game board textures
4. Style question categories with appropriate color coding
5. Create trophy and achievement visual elements
6. Test category-based visual feedback

## Technical Requirements
- **Theme Management**: Implement a theme context/provider for switching
- **CSS Organization**: Use CSS modules or styled-components for theme isolation
- **Local Storage**: Persist user's theme preference
- **Component Structure**: Maintain existing component hierarchy
- **Socket Events**: Ensure real-time functionality works with all themes
- **Performance**: Optimize theme assets and animations

## Notes
- Each theme should be implemented as a separate branch initially
- Follow existing React patterns and component structure
- Maintain backwards compatibility with existing game functionality
- Ensure themes work with both light and dark mode preferences
- Consider adding theme preview screenshots to each sub-issue
- Test multiplayer functionality thoroughly with each theme
- The Epic issue should track overall progress and integration of all three themes
