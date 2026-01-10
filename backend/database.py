"""
Database operations for ThreadCraft using Supabase.

This module handles all database interactions for storing and retrieving
encrypted thread progress data using Supabase as the backend.
"""

import hashlib
import base64
import logging
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet

from config import Config

logger = logging.getLogger(__name__)

# Try importing Supabase (may not be available)
try:
    from supabase import create_client, Client
    from supabase.lib.client_options import ClientOptions
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None  # type: ignore
    create_client = None  # type: ignore
    ClientOptions = None  # type: ignore


class DatabaseManager:
    """Manages database operations for thread progress storage."""

    def __init__(self):
        """Initialize database connection and encryption setup."""
        self.supabase: Optional[Client] = None
        self._initialize_supabase()
        self._salt = Config.DATABASE_SALT.encode()

    def _initialize_supabase(self) -> None:
        """
        Initialize Supabase client connection.

        Raises:
            ValueError: If required environment variables are missing.
        """
        if not SUPABASE_AVAILABLE:
            logger.warning(
                "Supabase library not installed. Install with: pip install supabase"
            )
            return

        supabase_url = Config.SUPABASE_URL
        supabase_key = Config.SUPABASE_KEY

        if not supabase_url or not supabase_key:
            logger.warning(
                "Supabase credentials not configured. Progress will not be persisted to database."
            )
            return

        try:
            if create_client and ClientOptions:
                self.supabase = create_client(
                    supabase_url,
                    supabase_key,
                    options=ClientOptions(auto_refresh_token=True, persist_session=False),
                )
                logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            # Don't raise - allow fallback to file storage

    def _hash_user_identifier(self, session_id: str) -> str:
        """
        Generate SHA-256 hash of user identifier (session_id + salt).

        Args:
            session_id: User's session ID.

        Returns:
            Hexadecimal string of the SHA-256 hash (64 characters).
        """
        combined = (session_id + Config.DATABASE_SALT).encode()
        hash_obj = hashlib.sha256(combined)
        return hash_obj.hexdigest()

    def _encrypt_thread_id(self, thread_id: Optional[str], session_id: str) -> Optional[str]:
        """
        Encrypt thread ID using Fernet encryption.

        Args:
            thread_id: Thread ID/URL to encrypt.
            session_id: Session ID used to generate encryption key.

        Returns:
            Base64-encoded encrypted string, or None if thread_id is None.
        """
        if thread_id is None:
            return None

        try:
            # Generate encryption key from session ID (same method as session_manager)
            key = hashlib.sha256(session_id.encode()).digest()
            fernet_key = base64.urlsafe_b64encode(key)
            fernet = Fernet(fernet_key)

            encrypted = fernet.encrypt(thread_id.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Failed to encrypt thread_id: {e}")
            raise

    def _decrypt_thread_id(self, encrypted_thread_id: Optional[str], session_id: str) -> Optional[str]:
        """
        Decrypt thread ID using Fernet decryption.

        Args:
            encrypted_thread_id: Encrypted thread ID string.
            session_id: Session ID used to generate decryption key.

        Returns:
            Decrypted thread ID/URL, or None if encrypted_thread_id is None.
        """
        if encrypted_thread_id is None:
            return None

        try:
            # Generate decryption key from session ID (same method as session_manager)
            key = hashlib.sha256(session_id.encode()).digest()
            fernet_key = base64.urlsafe_b64encode(key)
            fernet = Fernet(fernet_key)

            decrypted = fernet.decrypt(encrypted_thread_id.encode())
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt thread_id: {e}")
            raise

    def _encrypt_credentials(self, credentials: Dict[str, str], session_id: str) -> str:
        """
        Encrypt credentials using Fernet encryption.

        Args:
            credentials: Dictionary containing API credentials.
            session_id: Session ID used to generate encryption key.

        Returns:
            Base64-encoded encrypted string.

        Raises:
            Exception: If encryption fails.
        """
        try:
            key = hashlib.sha256(session_id.encode()).digest()
            fernet_key = base64.urlsafe_b64encode(key)
            fernet = Fernet(fernet_key)

            import json
            encrypted = fernet.encrypt(json.dumps(credentials).encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Failed to encrypt credentials: {e}")
            raise

    def _decrypt_credentials(self, encrypted_credentials: str, session_id: str) -> Dict[str, str]:
        """
        Decrypt credentials using Fernet decryption.

        Args:
            encrypted_credentials: Encrypted credentials string.
            session_id: Session ID used to generate decryption key.

        Returns:
            Decrypted credentials dictionary.

        Raises:
            Exception: If decryption fails.
        """
        try:
            key = hashlib.sha256(session_id.encode()).digest()
            fernet_key = base64.urlsafe_b64encode(key)
            fernet = Fernet(fernet_key)

            decrypted = fernet.decrypt(encrypted_credentials.encode())
            import json
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error(f"Failed to decrypt credentials: {e}")
            raise

    def save_user_data(
        self,
        session_id: str,
        credentials: Dict[str, str],
        day: Optional[int] = None,
        thread_id: Optional[str] = None,
    ) -> bool:
        """
        Save user credentials and optionally progress to database with encryption.

        Args:
            session_id: User's session ID.
            credentials: Dictionary containing API credentials.
            day: Optional current day number (0-indexed). If None, keeps existing value.
            thread_id: Optional thread ID/URL. If None, keeps existing value.

        Returns:
            True if save was successful, False otherwise.
        """
        if not self.supabase:
            logger.warning("Supabase not initialized, cannot save user data")
            return False

        try:
            user_hash = self._hash_user_identifier(session_id)
            encrypted_credentials = self._encrypt_credentials(credentials, session_id)

            update_data = {
                "user_identifier_hash": user_hash,
                "encrypted_credentials": encrypted_credentials,
            }

            # Only update progress fields if provided
            if day is not None:
                update_data["current_day"] = day
            if thread_id is not None:
                update_data["encrypted_thread_id"] = self._encrypt_thread_id(thread_id, session_id)

            # Upsert: Update if exists, insert if new
            response = (
                self.supabase.table("threadcraft_users")
                .upsert(update_data, on_conflict="user_identifier_hash")
                .execute()
            )

            logger.info(f"User data saved to database: user_hash={user_hash[:8]}...")
            return True
        except Exception as e:
            logger.error(f"Failed to save user data to database: {e}")
            return False

    def load_user_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Load user credentials and progress from database and decrypt.

        Args:
            session_id: User's session ID.

        Returns:
            Dictionary with 'credentials', 'day', and 'thread_id' keys.
            Returns None if user not found.
        """
        if not self.supabase:
            logger.warning("Supabase not initialized, cannot load user data")
            return None

        try:
            user_hash = self._hash_user_identifier(session_id)

            response = (
                self.supabase.table("threadcraft_users")
                .select("*")
                .eq("user_identifier_hash", user_hash)
                .execute()
            )

            if not response.data:
                logger.debug("No user data found in database")
                return None

            row = response.data[0]
            encrypted_credentials = row.get("encrypted_credentials")
            encrypted_thread_id = row.get("encrypted_thread_id")

            credentials = self._decrypt_credentials(encrypted_credentials, session_id)
            thread_id = self._decrypt_thread_id(encrypted_thread_id, session_id)
            day = row.get("current_day", 0)

            logger.debug(f"Loaded user data from database: user_hash={user_hash[:8]}...")
            return {
                "credentials": credentials,
                "day": day,
                "thread_id": thread_id,
            }
        except Exception as e:
            logger.error(f"Failed to load user data from database: {e}")
            return None

    def delete_user_data(self, session_id: str) -> bool:
        """
        Delete all user data from database (credentials and progress).

        Args:
            session_id: User's session ID.

        Returns:
            True if deletion was successful, False otherwise.
        """
        if not self.supabase:
            logger.warning("Supabase not initialized, cannot delete user data")
            return False

        try:
            user_hash = self._hash_user_identifier(session_id)

            response = (
                self.supabase.table("threadcraft_users")
                .delete()
                .eq("user_identifier_hash", user_hash)
                .execute()
            )

            logger.info(f"User data deleted from database: user_hash={user_hash[:8]}...")
            return True
        except Exception as e:
            logger.error(f"Failed to delete user data from database: {e}")
            return False

    def save_progress(
        self, session_id: str, day: int, thread_id: Optional[str]
    ) -> bool:
        """
        Save only progress (day and thread_id) to database.
        Credentials must already exist in database.

        Args:
            session_id: User's session ID.
            day: Current day number (0-indexed).
            thread_id: Thread ID/URL to encrypt and store.

        Returns:
            True if save was successful, False otherwise.
        """
        if not self.supabase:
            logger.warning("Supabase not initialized, cannot save progress")
            return False

        try:
            user_hash = self._hash_user_identifier(session_id)

            # First check if user exists
            response = (
                self.supabase.table("threadcraft_users")
                .select("encrypted_credentials")
                .eq("user_identifier_hash", user_hash)
                .execute()
            )

            if not response.data:
                logger.warning("Cannot save progress: user credentials not found in database")
                return False

            encrypted_thread_id = self._encrypt_thread_id(thread_id, session_id)

            # Update only progress fields
            response = (
                self.supabase.table("threadcraft_users")
                .update(
                    {
                        "encrypted_thread_id": encrypted_thread_id,
                        "current_day": day,
                    }
                )
                .eq("user_identifier_hash", user_hash)
                .execute()
            )

            logger.info(f"Progress saved to database: day={day}, user_hash={user_hash[:8]}...")
            return True
        except Exception as e:
            logger.error(f"Failed to save progress to database: {e}")
            return False

    def load_progress(self, session_id: str) -> Dict[str, Any]:
        """
        Load only progress from database (not credentials).

        Args:
            session_id: User's session ID.

        Returns:
            Dictionary with 'day' and 'thread_id' keys.
            Returns default progress if not found.
        """
        user_data = self.load_user_data(session_id)
        if user_data:
            return {
                "day": user_data.get("day", 0),
                "thread_id": user_data.get("thread_id"),
            }
        return {"day": 0, "thread_id": None}

    def reset_progress(self, session_id: str) -> bool:
        """
        Reset progress for a user (set day to 0, thread_id to None).

        Args:
            session_id: User's session ID.

        Returns:
            True if reset was successful, False otherwise.
        """
        return self.save_progress(session_id, 0, None)

    def is_available(self) -> bool:
        """
        Check if database connection is available.

        Returns:
            True if Supabase is initialized and available, False otherwise.
        """
        return self.supabase is not None


# Global database manager instance
database_manager = DatabaseManager()

