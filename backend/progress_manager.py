"""
Progress management for ThreadCraft backend.

This module handles loading and saving thread progress to persistent storage.
Supports both Supabase database (with encryption) and JSON file fallback.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from constants import DEFAULT_PROGRESS
from config import Config

# Import database manager (may not be available if Supabase not configured)
try:
    from database import database_manager
except (ImportError, AttributeError):
    database_manager = None

logger = logging.getLogger(__name__)


class ProgressManager:
    """Manages thread progress persistence with database and file fallback."""

    def __init__(self, progress_file: Path):
        """
        Initialize progress manager.

        Args:
            progress_file: Path to the JSON file where progress is stored (fallback).
        """
        self.progress_file = progress_file
        self._ensure_progress_file()

    def _ensure_progress_file(self) -> None:
        """Ensure the progress file directory exists."""
        try:
            self.progress_file.parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.error(f"Failed to create progress file directory: {e}")
            raise

    def load(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Load progress from database (if available and session_id provided) or file.

        Args:
            session_id: Optional session ID for database lookup. If provided and
                       database is available, will load from database instead of file.

        Returns:
            Progress dictionary with 'day' and 'thread_id' keys.
            Returns default progress if not found or error occurs.
        """
        # Try database first if session_id provided and database available
        if session_id and database_manager and database_manager.is_available():
            try:
                progress = database_manager.load_progress(session_id)
                logger.debug(
                    f"Loaded progress from database: day={progress.get('day')}, "
                    f"thread_id={progress.get('thread_id')}"
                )
                return progress
            except Exception as e:
                logger.warning(f"Failed to load from database, falling back to file: {e}")

        # Fallback to JSON file
        try:
            if not self.progress_file.exists():
                logger.debug("Progress file does not exist, returning defaults")
                return DEFAULT_PROGRESS.copy()

            with open(self.progress_file, "r", encoding="utf-8") as f:
                progress = json.load(f)
                logger.debug(
                    f"Loaded progress from file: day={progress.get('day')}, "
                    f"thread_id={progress.get('thread_id')}"
                )
                return progress

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in progress file: {e}")
            return DEFAULT_PROGRESS.copy()
        except Exception as e:
            logger.error(f"Failed to load progress: {e}")
            return DEFAULT_PROGRESS.copy()

    def save(self, day: int, thread_id: Optional[str], session_id: Optional[str] = None) -> None:
        """
        Save progress to database (if available and session_id provided) or file.

        Args:
            day: Current day number (0-indexed).
            thread_id: Thread ID string, or None if no active thread.
            session_id: Optional session ID for database storage. If provided and
                       database is available, will save to database instead of file.

        Raises:
            IOError: If file writing fails and database save also fails.
        """
        # Try database first if session_id provided and database available
        if session_id and database_manager and database_manager.is_available():
            try:
                success = database_manager.save_progress(session_id, day, thread_id)
                if success:
                    logger.info(
                        f"Saved progress to database: day={day}, thread_id={thread_id}"
                    )
                    return
                else:
                    logger.warning("Database save returned False, falling back to file")
            except Exception as e:
                logger.warning(f"Failed to save to database, falling back to file: {e}")

        # Fallback to JSON file
        try:
            progress_data = {
                "day": day,
                "thread_id": thread_id,
            }

            with open(self.progress_file, "w", encoding="utf-8") as f:
                json.dump(progress_data, f, indent=2)

            logger.info(f"Saved progress to file: day={day}, thread_id={thread_id}")
        except Exception as e:
            logger.error(f"Failed to save progress: {e}")
            raise

    def reset(self, session_id: Optional[str] = None) -> None:
        """
        Reset progress to default values.

        Args:
            session_id: Optional session ID for database reset. If provided and
                       database is available, will reset in database instead of file.

        Raises:
            IOError: If file writing fails and database reset also fails.
        """
        self.save(0, None, session_id)
        logger.info("Progress reset to defaults")


# Global progress manager instance
progress_manager = ProgressManager(Config.PROGRESS_FILE)

