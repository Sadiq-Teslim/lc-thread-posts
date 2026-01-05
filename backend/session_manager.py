"""
Session management for ThreadCraft backend.

This module handles session creation, validation, encryption/decryption
of credentials, and session storage.
"""

import json
import hashlib
import secrets
import base64
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet

from constants import SESSION_EXPIRY_HOURS, SESSION_ID_LENGTH
from config import Config

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages user sessions and credential encryption."""

    def __init__(self):
        """Initialize the session manager with in-memory storage."""
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def generate_encryption_key(self, session_id: str) -> bytes:
        """
        Generate a Fernet encryption key from session ID.

        Args:
            session_id: Unique session identifier.

        Returns:
            Base64-encoded encryption key.
        """
        key = hashlib.sha256(session_id.encode()).digest()
        return base64.urlsafe_b64encode(key)

    def encrypt_credentials(self, credentials: Dict[str, str], session_id: str) -> str:
        """
        Encrypt credentials using Fernet encryption.

        Args:
            credentials: Dictionary containing API credentials.
            session_id: Session ID used to generate encryption key.

        Returns:
            Encrypted credentials as base64-encoded string.

        Raises:
            Exception: If encryption fails.
        """
        try:
            key = self.generate_encryption_key(session_id)
            fernet = Fernet(key)
            encrypted_data = fernet.encrypt(json.dumps(credentials).encode())
            return encrypted_data.decode()
        except Exception as e:
            logger.error(f"Failed to encrypt credentials: {e}")
            raise

    def decrypt_credentials(self, encrypted_data: str, session_id: str) -> Dict[str, str]:
        """
        Decrypt credentials using Fernet decryption.

        Args:
            encrypted_data: Encrypted credentials as base64-encoded string.
            session_id: Session ID used to generate decryption key.

        Returns:
            Decrypted credentials as dictionary.

        Raises:
            Exception: If decryption fails.
        """
        try:
            key = self.generate_encryption_key(session_id)
            fernet = Fernet(key)
            decrypted_data = fernet.decrypt(encrypted_data.encode())
            return json.loads(decrypted_data.decode())
        except Exception as e:
            logger.error(f"Failed to decrypt credentials for session {session_id}: {e}")
            raise

    def create_session(self, credentials: Dict[str, str]) -> str:
        """
        Create a new session and store encrypted credentials.

        Args:
            credentials: Dictionary containing API credentials.

        Returns:
            Newly created session ID.

        Raises:
            Exception: If session creation fails.
        """
        session_id = secrets.token_urlsafe(SESSION_ID_LENGTH)
        encrypted_creds = self.encrypt_credentials(credentials, session_id)

        expires_at = datetime.now() + timedelta(hours=SESSION_EXPIRY_HOURS)

        self._sessions[session_id] = {
            "encrypted_credentials": encrypted_creds,
            "created_at": datetime.now(),
            "expires_at": expires_at,
        }

        logger.info(f"Created new session: {session_id[:8]}... (expires: {expires_at})")
        return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session data if it exists and is not expired.

        Args:
            session_id: Session ID to retrieve.

        Returns:
            Session data dictionary if valid, None otherwise.
        """
        if not session_id or session_id not in self._sessions:
            return None

        session = self._sessions[session_id]

        # Check if session has expired
        if datetime.now() > session["expires_at"]:
            logger.debug(f"Session {session_id[:8]}... expired, removing")
            del self._sessions[session_id]
            return None

        return session

    def get_credentials(self, session_id: str) -> Optional[Dict[str, str]]:
        """
        Get decrypted credentials for a session.

        Args:
            session_id: Session ID.

        Returns:
            Decrypted credentials dictionary if session is valid, None otherwise.

        Raises:
            Exception: If decryption fails.
        """
        session = self.get_session(session_id)
        if not session:
            return None

        try:
            return self.decrypt_credentials(session["encrypted_credentials"], session_id)
        except Exception as e:
            logger.error(f"Failed to decrypt credentials for session {session_id[:8]}...: {e}")
            raise

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.

        Args:
            session_id: Session ID to delete.

        Returns:
            True if session was deleted, False if it didn't exist.
        """
        if session_id and session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Deleted session: {session_id[:8]}...")
            return True
        return False

    def is_session_valid(self, session_id: str) -> bool:
        """
        Check if a session is valid and not expired.

        Args:
            session_id: Session ID to check.

        Returns:
            True if session is valid, False otherwise.
        """
        return self.get_session(session_id) is not None


# Global session manager instance
session_manager = SessionManager()

