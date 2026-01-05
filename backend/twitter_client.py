"""
Twitter API client management for ThreadCraft backend.

This module provides utilities for creating and using Twitter API clients.
"""

import logging
from typing import Dict, Optional

import tweepy

logger = logging.getLogger(__name__)


class TwitterClientManager:
    """Manages Twitter API client creation and operations."""

    @staticmethod
    def create_client(credentials: Dict[str, str]) -> tweepy.Client:
        """
        Create a Twitter API client with provided credentials.

        Args:
            credentials: Dictionary containing Twitter API credentials:
                - bearer_token: Bearer token for API v2
                - api_key: API key (consumer key)
                - api_secret: API secret (consumer secret)
                - access_token: Access token
                - access_token_secret: Access token secret

        Returns:
            Configured tweepy.Client instance.

        Raises:
            ValueError: If required credentials are missing.
        """
        required_fields = [
            "bearer_token",
            "api_key",
            "api_secret",
            "access_token",
            "access_token_secret",
        ]

        missing_fields = [field for field in required_fields if not credentials.get(field)]
        if missing_fields:
            raise ValueError(f"Missing required credentials: {', '.join(missing_fields)}")

        try:
            client = tweepy.Client(
                bearer_token=credentials.get("bearer_token"),
                consumer_key=credentials.get("api_key"),
                consumer_secret=credentials.get("api_secret"),
                access_token=credentials.get("access_token"),
                access_token_secret=credentials.get("access_token_secret"),
            )
            logger.debug("Twitter client created successfully")
            return client
        except Exception as e:
            logger.error(f"Failed to create Twitter client: {e}")
            raise

    @staticmethod
    def validate_credentials(credentials: Dict[str, str]) -> tuple[bool, Optional[str]]:
        """
        Validate Twitter API credentials by attempting to authenticate.

        Args:
            credentials: Dictionary containing Twitter API credentials.

        Returns:
            Tuple of (is_valid, error_message). error_message is None if valid.
        """
        try:
            client = TwitterClientManager.create_client(credentials)
            client.get_me()
            logger.debug("Credentials validated successfully")
            return True, None
        except Exception as e:
            error_msg = str(e).lower()
            if "unauthorized" in error_msg or "401" in error_msg:
                return False, "Invalid API credentials. Please check your keys."
            elif "forbidden" in error_msg or "403" in error_msg:
                return False, "API credentials do not have required permissions."
            else:
                logger.error(f"Credential validation failed: {e}")
                return False, f"Failed to validate credentials: {str(e)}"

