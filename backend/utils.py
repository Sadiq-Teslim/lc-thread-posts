"""
Utility functions for the ThreadCraft backend.

This module contains reusable utility functions for common operations
such as validation, URL parsing, and error handling.
"""

import re
import logging
from typing import Optional, Tuple
from urllib.parse import urlparse, parse_qs

from constants import (
    THREAD_URL_STATUS_PATTERN,
    X_COM_DOMAIN,
    TWITTER_COM_DOMAIN,
    DAY_PATTERN_REGEX,
)

logger = logging.getLogger(__name__)


def extract_thread_id_from_url(url: str) -> Optional[str]:
    """
    Extract thread ID from a Twitter/X thread URL.

    Supports multiple URL formats:
    - https://x.com/username/status/1234567890
    - https://twitter.com/username/status/1234567890
    - https://x.com/username/status/1234567890?ref_src=...
    - Direct thread ID: 1234567890

    Args:
        url: Thread URL or thread ID string.

    Returns:
        Extracted thread ID as string, or None if extraction fails.
    """
    if not url or not isinstance(url, str):
        return None

    url = url.strip()

    # If it's already a numeric ID, return it
    if url.isdigit():
        return url

    # Check if it's a URL
    if X_COM_DOMAIN not in url and TWITTER_COM_DOMAIN not in url:
        # Not a URL, might be an ID or invalid
        return url if url.isdigit() else None

    # Extract ID using regex from URL pattern
    match = re.search(THREAD_URL_STATUS_PATTERN, url)
    if match:
        thread_id = match.group(1)
        logger.debug(f"Extracted thread ID {thread_id} from URL: {url}")
        return thread_id

    # Fallback: try to extract from URL path
    try:
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.split("/") if p]
        if len(path_parts) >= 2 and path_parts[-2] == "status":
            thread_id = path_parts[-1].split("?")[0]  # Remove query params
            if thread_id.isdigit():
                logger.debug(f"Extracted thread ID {thread_id} from URL path: {url}")
                return thread_id
    except Exception as e:
        logger.warning(f"Failed to parse URL {url}: {e}")

    logger.warning(f"Could not extract thread ID from URL: {url}")
    return None


def extract_day_from_text(text: str) -> Optional[int]:
    """
    Extract day number from text using pattern matching.

    Looks for patterns like "Day 1", "day 5", "DAY 10", etc.

    Args:
        text: Text to search for day pattern.

    Returns:
        Day number as integer if found, None otherwise.
    """
    if not text:
        return None

    match = re.search(DAY_PATTERN_REGEX, text, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except (ValueError, IndexError):
            return None

    return None


def validate_tweet_length(text: str, max_length: int = 280) -> Tuple[bool, Optional[str]]:
    """
    Validate tweet text length.

    Args:
        text: Tweet text to validate.
        max_length: Maximum allowed length (default: 280).

    Returns:
        Tuple of (is_valid, error_message). error_message is None if valid.
    """
    if not text or not text.strip():
        return False, "Tweet text cannot be empty."

    text_length = len(text)
    if text_length > max_length:
        return (
            False,
            f"Tweet is {text_length} characters. Maximum allowed is {max_length} characters.",
        )

    return True, None


def validate_thread_id(thread_id: str) -> Tuple[bool, Optional[str]]:
    """
    Validate thread ID format.

    Args:
        thread_id: Thread ID to validate.

    Returns:
        Tuple of (is_valid, error_message). error_message is None if valid.
    """
    if not thread_id or not thread_id.strip():
        return False, "Thread ID cannot be empty."

    # Thread IDs should be numeric
    thread_id = thread_id.strip()
    if not thread_id.isdigit():
        return False, "Thread ID must be a numeric value."

    return True, None

