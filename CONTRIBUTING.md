# Contributing to LeetCode Thread Poster

Thank you for your interest in contributing to LeetCode Thread Poster! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please:

- Be respectful and inclusive in your language and actions
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment (see below)
4. Create a branch for your changes
5. Make your changes and test them
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18 or higher
- Python 3.9 or higher
- Git

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Frontend linting
cd frontend
npm run lint

# Backend syntax check
cd backend
python -m py_compile app.py
```

## How to Contribute

### Types of Contributions

- **Bug fixes**: Fix issues reported in the issue tracker
- **Features**: Implement new features (please discuss first)
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **Performance**: Optimize existing code

### Before Contributing

1. Check existing issues and pull requests to avoid duplicates
2. For significant changes, open an issue first to discuss
3. Ensure your code follows the project's style guidelines

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Ensure all tests pass and the build succeeds
3. Update documentation as needed
4. Use clear, descriptive commit messages
5. Reference any related issues in your PR description
6. Request review from maintainers

### Commit Message Format

Use clear and descriptive commit messages:

```
type: brief description

Longer description if needed.

Fixes #issue_number
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Style Guidelines

### Python (Backend)

- Follow PEP 8 style guide
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions focused and small

### TypeScript/React (Frontend)

- Use TypeScript for type safety
- Follow React best practices and hooks guidelines
- Use functional components
- Keep components small and focused
- Use meaningful component and variable names

### General

- Write clear, self-documenting code
- Add comments only when necessary to explain "why"
- Keep files organized and properly structured

## Reporting Issues

When reporting issues, please include:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Your environment (OS, browser, Node.js version, Python version)

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed

## Questions?

If you have questions, feel free to:

- Open an issue with the `question` label
- Reach out to the maintainers

Thank you for contributing!
