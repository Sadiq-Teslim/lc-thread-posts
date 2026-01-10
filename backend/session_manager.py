"""
Session management for ThreadCraft backend.

This module handles session creation, validation, encryption/decryption
of credentials, and persistent storage in database.
"""

import secrets
import logging
from typing import Optional, Dict, Any

from constants import SESSION_ID_LENGTH
from config import Config

# Import database manager (may not be available if Supabase not configured)
try:
    from database import database_manager
except (ImportError, AttributeError):
    database_manager = None

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages user sessions and credential encryption.
    
    Credentials are stored persistently in the database (encrypted).
    Sessions persist until user explicitly disconnects.
    """

    def __init__(self):
        """Initialize the session manager with database-backed storage."""
        self._database_available = database_manager and database_manager.is_available()

    def create_session(self, credentials: Dict[str, str]) -> str:
        """
        Create a new session and store encrypted credentials in database.

        Args:
            credentials: Dictionary containing API credentials.

        Returns:
            Newly created session ID.

        Raises:
            Exception: If session creation fails.
        """
        session_id = secrets.token_urlsafe(SESSION_ID_LENGTH)

        # Save credentials to database (encrypted)
        if self._database_available:
            try:
                success = database_manager.save_user_data(
                    session_id=session_id,
                    credentials=credentials,
                    day=0,
                    thread_id=None,
                )
                if not success:
                    logger.error("Failed to save credentials to database")
                    raise Exception("Failed to persist credentials")
                logger.info(f"Created new session and saved to database: {session_id[:8]}...")
            except Exception as e:
                logger.error(f"Failed to save session to database: {e}")
                raise
        else:
            logger.warning("Database not available, session cannot be persisted")
            raise Exception("Database not configured. Please set up Supabase.")

        return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session data from database if it exists.

        Args:
            session_id: Session ID to retrieve.

        Returns:
            Session data dictionary if valid, None otherwise.
        """
        if not session_id:
            return None

        if not self._database_available:
            return None

        try:
            user_data = database_manager.load_user_data(session_id)
            if user_data:
                return {
                    "credentials": user_data.get("credentials"),
                    "created_at": None,  # Not tracking creation time anymore
                    "expires_at": None,  # No expiry - persistent until disconnect
                }
            return None
        except Exception as e:
            logger.error(f"Failed to load session from database: {e}")
            return None

    def get_credentials(self, session_id: str) -> Optional[Dict[str, str]]:
        """
        Get decrypted credentials for a session from database.

        Args:
            session_id: Session ID.

        Returns:
            Decrypted credentials dictionary if session is valid, None otherwise.

        Raises:
            Exception: If decryption fails.
        """
        if not session_id:
            return None

        if not self._database_available:
            return None

        try:
            user_data = database_manager.load_user_data(session_id)
            if user_data:
                return user_data.get("credentials")
            return None
        except Exception as e:
            logger.error(f"Failed to get credentials for session {session_id[:8]}...: {e}")
            raise

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session and all associated data from database.

        This removes credentials and progress permanently.

        Args:
            session_id: Session ID to delete.

        Returns:
            True if session was deleted, False if it didn't exist.
        """
        if not session_id:
            return False

        if not self._database_available:
            logger.warning("Database not available, cannot delete session")
            return False

        try:
            success = database_manager.delete_user_data(session_id)
            if success:
                logger.info(f"Deleted session and all user data: {session_id[:8]}...")
            return success
        except Exception as e:
            logger.error(f"Failed to delete session: {e}")
            return False

    def is_session_valid(self, session_id: str) -> bool:
        """
        Check if a session exists in the database.

        Args:
            session_id: Session ID to check.

        Returns:
            True if session is valid, False otherwise.
        """
        return self.get_session(session_id) is not None


# Global session manager instance
session_manager = SessionManager()

