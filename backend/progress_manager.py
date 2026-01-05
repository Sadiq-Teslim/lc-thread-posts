"""
Progress management for ThreadCraft backend.

This module handles loading and saving thread progress to persistent storage.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from constants import DEFAULT_PROGRESS
from config import Config

logger = logging.getLogger(__name__)


class ProgressManager:
    """Manages thread progress persistence."""

    def __init__(self, progress_file: Path):
        """
        Initialize progress manager.

        Args:
            progress_file: Path to the JSON file where progress is stored.
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

    def load(self) -> Dict[str, Any]:
        """
        Load progress from file.

        Returns:
            Progress dictionary with 'day' and 'thread_id' keys.
            Returns default progress if file doesn't exist or is invalid.
        """
        try:
            if not self.progress_file.exists():
                logger.debug("Progress file does not exist, returning defaults")
                return DEFAULT_PROGRESS.copy()

            with open(self.progress_file, "r", encoding="utf-8") as f:
                progress = json.load(f)
                logger.debug(f"Loaded progress: day={progress.get('day')}, thread_id={progress.get('thread_id')}")
                return progress

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in progress file: {e}")
            return DEFAULT_PROGRESS.copy()
        except Exception as e:
            logger.error(f"Failed to load progress: {e}")
            return DEFAULT_PROGRESS.copy()

    def save(self, day: int, thread_id: Optional[str]) -> None:
        """
        Save progress to file.

        Args:
            day: Current day number (0-indexed).
            thread_id: Thread ID string, or None if no active thread.

        Raises:
            IOError: If file writing fails.
        """
        try:
            progress_data = {
                "day": day,
                "thread_id": thread_id,
            }

            with open(self.progress_file, "w", encoding="utf-8") as f:
                json.dump(progress_data, f, indent=2)

            logger.info(f"Saved progress: day={day}, thread_id={thread_id}")
        except Exception as e:
            logger.error(f"Failed to save progress: {e}")
            raise

    def reset(self) -> None:
        """
        Reset progress to default values.

        Raises:
            IOError: If file writing fails.
        """
        self.save(0, None)
        logger.info("Progress reset to defaults")


# Global progress manager instance
progress_manager = ProgressManager(Config.PROGRESS_FILE)

