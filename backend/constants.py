"""
Application-wide constants and configuration values.

This module centralizes all constant values used throughout the application,
making them easier to maintain and update.
"""

from typing import Final

# Tweet/Content Limits
MAX_TWEET_LENGTH: Final[int] = 280
MIN_TWEET_LENGTH: Final[int] = 1

# Session Configuration
SESSION_EXPIRY_HOURS: Final[int] = 24
SESSION_ID_LENGTH: Final[int] = 32

# Thread Detection
DAY_PATTERN_REGEX: Final[str] = r'Day\s+(\d+)'
MAX_REPLIES_TO_FETCH: Final[int] = 100

# Thread URL Patterns
X_COM_DOMAIN: Final[str] = "x.com"
TWITTER_COM_DOMAIN: Final[str] = "twitter.com"
THREAD_URL_STATUS_PATTERN: Final[str] = r'/status/(\d+)'

# Progress File Structure
DEFAULT_PROGRESS: Final[dict] = {"day": 0, "thread_id": None}

# Required Credential Fields
REQUIRED_CREDENTIAL_FIELDS: Final[list[str]] = [
    "api_key",
    "api_secret",
    "access_token",
    "access_token_secret",
    "bearer_token",
]

