# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-04

### Added

- Web-based frontend application with React and Mantine UI
- Flask API backend with secure session management
- Settings page for configuring X/Twitter API credentials
- Dashboard with progress tracking and statistics
- Post Solution page with live tweet preview
- Start Thread page for creating new threads
- Dark/light mode support with system preference detection
- Mobile responsive design
- User-friendly error messages and notifications
- Encrypted credential storage (browser-side only)
- Session auto-expiry after 24 hours
- Character count and validation for tweets

### Changed

- Restructured project to support both CLI and web interfaces
- Updated README with comprehensive documentation
- Improved error handling throughout the application

### Security

- API credentials are encrypted using Fernet encryption
- Credentials stored only in browser local session
- No server-side credential storage
- Session-based authentication with automatic expiry

## [1.0.0] - 2024-12-01

### Added

- Initial release with CLI interface
- Twitter/X API integration via Tweepy
- Thread creation and management
- Daily solution posting with automatic day counter
- Progress tracking via JSON file
- GitHub Gist URL support
