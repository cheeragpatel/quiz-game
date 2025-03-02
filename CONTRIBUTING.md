# Contributing to Quiz Game

We love your input! We want to make contributing to Quiz Game as easy and transparent as possible.

## Development Process

1. Fork the repo and create your branch from `main`.
2. Make your changes.
3. Ensure the test suite passes (`npm test`).
4. Submit a pull request!

## Project Structure

```
quiz-game/
├── backend/           # Backend server code
│   ├── server.js       # Main Express server
│   ├── questionGenerator.js
│   └── virtualHost.js
├── frontend/         # React frontend
│   ├── src/
│   └── public/
├── docs/            # Documentation
└── tests/           # Test files
```

## Code Style

- Use ES6+ features
- Follow existing code formatting
- Write meaningful commit messages
- Comment complex logic
- Add JSDoc comments for functions

## Testing

- Write tests for new features
- Update tests for changes
- Run `npm test` before submitting PR

## Pull Request Process

1. Update documentation
2. Update CHANGELOG.md
3. Resolve conflicts
4. Get approval from maintainers

## Running Locally

1. Clone repo
2. Run `npm run setup`
3. Start Redis server
4. Run `npm run dev`

## Working with GPT-4

When modifying AI-related features:

1. Test prompts thoroughly
2. Consider token usage
3. Handle API errors gracefully
4. Document prompt patterns

## Feature Requests

- Open issue with feature tag
- Discuss implementation
- Get feedback from maintainers

## Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Screenshots
- Environment details

## License

By contributing, you agree that your contributions will be licensed under the ISC License.