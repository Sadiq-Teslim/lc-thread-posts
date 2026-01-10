"""
Configuration management for ThreadCraft backend.

This module handles loading and accessing configuration values from
environment variables and provides sensible defaults.
"""

import os
import secrets
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class Config:
    """Application configuration loaded from environment variables."""

    # Flask Configuration
    SECRET_KEY: str = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(32))
    DEBUG: bool = os.environ.get("FLASK_ENV", "production") != "production"
    PORT: int = int(os.environ.get("PORT", 5000))

    # CORS Configuration
    ALLOWED_ORIGINS: Optional[list[str]] = (
        [origin.strip() for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",") if origin.strip()]
        if os.environ.get("ALLOWED_ORIGINS")
        else None
    )

    # File Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    PROGRESS_FILE: Path = BASE_DIR / "progress.json"
    FRONTEND_DIST_PATH: Path = BASE_DIR / "frontend" / "dist"

    # Supabase Configuration
    SUPABASE_URL: Optional[str] = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY: Optional[str] = os.environ.get("SUPABASE_KEY")
    # Salt for hashing user identifiers - CHANGE THIS IN PRODUCTION!
    DATABASE_SALT: str = os.environ.get(
        "DATABASE_SALT", "threadcraft-default-salt-change-in-production"
    )

    # Logging Configuration
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO").upper()

    @classmethod
    def get_cors_origins(cls) -> Optional[list[str]]:
        """
        Get CORS allowed origins.

        Returns:
            List of allowed origins or None if all origins are allowed.
        """
        return cls.ALLOWED_ORIGINS

    @classmethod
    def setup_logging(cls) -> None:
        """Configure application logging."""
        logging.basicConfig(
            level=getattr(logging, cls.LOG_LEVEL, logging.INFO),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        logger.info(f"Logging configured at {cls.LOG_LEVEL} level")

