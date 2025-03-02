# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Code cleanup and documentation improvements
- Better organization of project files
- Enhanced Docker setup for development and production
- Added comprehensive deployment guide
- Added contributing guidelines

## [1.0.0] - 2024-01-15
### Added
- Initial release of Quiz Game
- Dynamic question generation using GPT-4
- Real-time multiplayer support with Socket.IO
- GitHub-based player registration
- Virtual host (Mona Woolery) with dynamic commentary
- Game master controls
- Player view for answering questions
- Game show view for displaying game state
- Redis-based game state persistence
- Docker support for easy deployment

### Dependencies
- Node.js 16+
- Redis
- OpenAI GPT-4 API
- React 19
- Socket.IO 4.8
- Express 4.21

## [0.9.0] - 2024-01-10
### Added
- Beta testing release
- Basic game functionality
- Simple player registration
- Question generation
- Score tracking

### Changed
- Improved error handling
- Enhanced state management

### Fixed
- Socket connection issues
- Redis persistence bugs
- Game state synchronization problems

## [0.8.0] - 2024-01-05
### Added
- Alpha testing release
- Initial implementation of core features
- Basic project structure