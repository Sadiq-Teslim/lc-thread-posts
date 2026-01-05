"""
Custom exceptions and error handling utilities.

This module defines custom exceptions and provides utilities for converting
technical errors into user-friendly messages.
"""

from typing import Tuple


class ThreadCraftError(Exception):
    """Base exception for ThreadCraft application errors."""

    pass


class ValidationError(ThreadCraftError):
    """Raised when input validation fails."""

    pass


class AuthenticationError(ThreadCraftError):
    """Raised when authentication fails."""

    pass


class AuthorizationError(ThreadCraftError):
    """Raised when authorization fails."""

    pass


class TwitterAPIError(ThreadCraftError):
    """Raised when Twitter API operations fail."""

    pass


def friendly_error_message(error: Exception) -> Tuple[str, str]:
    """
    Convert technical errors to user-friendly error codes and messages.

    This function analyzes exception messages and returns standardized
    error codes and user-friendly messages.

    Args:
        error: The exception that occurred.

    Returns:
        Tuple of (error_code, user_message) where:
        - error_code: Machine-readable error code (e.g., "AUTHENTICATION_FAILED")
        - user_message: Human-readable error message for display to users.
    """
    error_str = str(error).lower()

    # Authentication errors
    if "unauthorized" in error_str or "401" in error_str:
        return (
            "AUTHENTICATION_FAILED",
            "Your X/Twitter API credentials appear to be invalid. Please check your API keys in settings.",
        )

    # Authorization errors
    if "forbidden" in error_str or "403" in error_str:
        return (
            "PERMISSION_DENIED",
            "Your X/Twitter account does not have permission for this action. "
            "Please check your app permissions on the Twitter Developer Portal.",
        )

    # Rate limiting
    if "rate limit" in error_str or "429" in error_str:
        return (
            "RATE_LIMITED",
            "You've hit the X/Twitter rate limit. Please wait a few minutes before trying again.",
        )

    # Duplicate content
    if "duplicate" in error_str:
        return (
            "DUPLICATE_TWEET",
            "This tweet appears to be a duplicate. Please modify your content and try again.",
        )

    # Length validation
    if "too long" in error_str or "character" in error_str:
        return (
            "TWEET_TOO_LONG",
            "Your tweet is too long. Please shorten it to 280 characters or less.",
        )

    # Network/connection errors
    if "connection" in error_str or "timeout" in error_str or "network" in error_str:
        return (
            "CONNECTION_ERROR",
            "Unable to connect to X/Twitter. Please check your internet connection and try again.",
        )

    # Not found errors
    if "not found" in error_str or "404" in error_str:
        return (
            "NOT_FOUND",
            "The requested resource was not found. Please check your input and try again.",
        )

    # Default/unknown error
    return (
        "UNKNOWN_ERROR",
        "Something went wrong while processing your request. Please try again or check your settings.",
    )

