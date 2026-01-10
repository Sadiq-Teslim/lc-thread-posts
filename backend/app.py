"""
Flask API Backend for ThreadCraft.

A production-ready REST API that bridges the frontend to Twitter/X functionality,
providing secure session management, credential encryption, and thread posting capabilities.

This module serves as the main entry point for the Flask application and defines
all API endpoints, middleware, and request handlers.
"""

import logging
import os
from datetime import datetime
from functools import wraps
from typing import Dict, Any, Tuple, Callable

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from config import Config
from constants import (
    MAX_TWEET_LENGTH,
    REQUIRED_CREDENTIAL_FIELDS,
    MAX_REPLIES_TO_FETCH,
)
from errors import friendly_error_message
from session_manager import session_manager
from progress_manager import progress_manager
from twitter_client import TwitterClientManager
from utils import (
    extract_thread_id_from_url,
    extract_day_from_text,
    validate_tweet_length,
    validate_thread_id,
)

# Configure logging
Config.setup_logging()
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder=None)
app.config["SECRET_KEY"] = Config.SECRET_KEY


cors_origins = Config.get_cors_origins()
CORS(app, supports_credentials=True, origins=cors_origins if cors_origins else "*")


if Config.FRONTEND_DIST_PATH.exists():
    app.static_folder = str(Config.FRONTEND_DIST_PATH)


# ============== MIDDLEWARE & DECORATORS ==============


def get_session_id() -> str | None:
    """
    Extract session ID from request headers.

    Returns:
        Session ID string if present, None otherwise.
    """
    return request.headers.get("X-Session-ID")


def require_credentials(f: Callable) -> Callable:
    """
    Decorator to require valid credentials for API endpoints.

    This decorator:
    1. Extracts the session ID from request headers
    2. Validates the session exists and is not expired
    3. Decrypts and attaches credentials to the request object
    4. Returns appropriate error responses if validation fails

    Args:
        f: The Flask route function to protect.

    Returns:
        Decorated function that validates credentials before execution.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = get_session_id()

        if not session_id:
            logger.warning("Request missing session ID")
            return (
                jsonify(
                    {
                        "success": False,
                        "error_code": "NO_SESSION",
                        "message": "Please configure your settings first to start using the app.",
                    }
                ),
                401,
            )

        session = session_manager.get_session(session_id)
        if not session:
            logger.warning(f"Invalid or expired session: {session_id[:8] if session_id else 'None'}...")
            return (
                jsonify(
                    {
                        "success": False,
                        "error_code": "SESSION_EXPIRED",
                        "message": "Your session has expired. Please reconfigure your API keys.",
                    }
                ),
                401,
            )

        try:
            credentials = session_manager.get_credentials(session_id)
            if not credentials:
                logger.error(f"Failed to decrypt credentials for session: {session_id[:8]}...")
                return (
                    jsonify(
                        {
                            "success": False,
                            "error_code": "INVALID_CREDENTIALS",
                            "message": "Unable to decrypt your credentials. Please reconfigure your API keys.",
                        }
                    ),
                    401,
                )
            request.twitter_credentials = credentials
        except Exception as e:
            logger.error(f"Error decrypting credentials: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error_code": "INVALID_CREDENTIALS",
                        "message": "Unable to decrypt your credentials. Please reconfigure your API keys.",
                    }
                ),
                401,
            )

        return f(*args, **kwargs)

    return decorated_function


# ============== API ENDPOINTS ==============


@app.route("/api/health", methods=["GET"])
def health_check() -> Tuple[Dict[str, Any], int]:
    """
    Health check endpoint for monitoring and load balancers.

    Returns:
        JSON response with server status and timestamp.
    """
    return (
        jsonify(
            {
                "success": True,
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
            }
        ),
        200,
    )


@app.route("/api/session/create", methods=["POST"])
def create_session() -> Tuple[Dict[str, Any], int]:
    """
    Create a new session and store encrypted credentials.

    Validates Twitter API credentials by attempting authentication,
    then creates an encrypted session that expires after 24 hours.

    Request Body:
        - api_key: Twitter API key (consumer key)
        - api_secret: Twitter API secret (consumer secret)
        - access_token: Twitter access token
        - access_token_secret: Twitter access token secret
        - bearer_token: Twitter bearer token

    Returns:
        JSON response with session_id and expiry information on success,
        or error details on failure.
    """
    data = request.get_json() or {}

    # Validate required fields
    missing_fields = [
        field for field in REQUIRED_CREDENTIAL_FIELDS if not data.get(field)
    ]
    if missing_fields:
        logger.warning(f"Session creation failed: missing fields {missing_fields}")
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "MISSING_CREDENTIALS",
                    "message": f'Please provide all required API keys. Missing: {", ".join(missing_fields)}',
                }
            ),
            400,
        )

    # Validate credentials by attempting to connect
    is_valid, validation_error = TwitterClientManager.validate_credentials(data)
    if not is_valid:
        logger.warning(f"Credential validation failed: {validation_error}")
        error_code, message = friendly_error_message(
            Exception(validation_error or "Invalid credentials")
        )
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            400,
        )

    try:
        # Create session
        session_id = session_manager.create_session(data)
        logger.info(f"Session created successfully: {session_id[:8]}...")

        return (
            jsonify(
                {
                    "success": True,
                    "session_id": session_id,
                    "message": "Successfully connected to X/Twitter! Your credentials are saved securely. You can now start posting.",
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/session/validate", methods=["GET"])
def validate_session() -> Tuple[Dict[str, Any], int]:
    """
    Validate if current session is still active.

    Returns:
        JSON response indicating session validity and expiry information.
    """
    session_id = get_session_id()

    if not session_id:
        return (
            jsonify(
                {
                    "success": False,
                    "valid": False,
                    "message": "No active session found. Please configure your API keys.",
                }
            ),
            200,  
        )

    session = session_manager.get_session(session_id)
    if not session:
        return (
            jsonify(
                {
                    "success": False,
                    "valid": False,
                    "message": "No active session found. Please configure your API keys.",
                }
            ),
            200,  # Not an error, just no session
        )

    return (
        jsonify(
            {
                "success": True,
                "valid": True,
                "message": "Session is active. Your credentials are saved.",
            }
        ),
        200,
    )


@app.route("/api/session/destroy", methods=["DELETE"])
def destroy_session() -> Tuple[Dict[str, Any], int]:
    """
    Destroy current session (logout).

    Removes the session from storage, effectively logging out the user.

    Returns:
        JSON response confirming session destruction.
    """
    session_id = get_session_id()

    if session_id:
        deleted = session_manager.delete_session(session_id)
        if deleted:
            logger.info(f"Session destroyed: {session_id[:8]}...")

    return (
        jsonify(
            {
                "success": True,
                "message": "Disconnected successfully. All your credentials and data have been removed from the database.",
            }
        ),
        200,
    )


@app.route("/api/progress", methods=["GET"])
@require_credentials
def get_progress() -> Tuple[Dict[str, Any], int]:
    """
    Get current posting progress.

    Returns the current day number and active thread ID if available.

    Returns:
        JSON response with progress data.
    """
    try:
        session_id = get_session_id()
        progress = progress_manager.load(session_id)
        return (
            jsonify(
                {
                    "success": True,
                    "data": {
                        "current_day": progress.get("day", 0),
                        "thread_id": progress.get("thread_id"),
                        "has_active_thread": progress.get("thread_id") is not None,
                        "next_day": progress.get("day", 0) + 1,
                    },
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Failed to load progress: {e}")
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/progress/reset", methods=["POST"])
@require_credentials
def reset_progress() -> Tuple[Dict[str, Any], int]:
    """
    Reset progress to start a new thread.

    Clears the current day counter and thread ID.

    Returns:
        JSON response confirming progress reset.
    """
    try:
        session_id = get_session_id()
        progress_manager.reset(session_id)
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Progress has been reset. You can now start a new thread.",
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Failed to reset progress: {e}")
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/thread/start", methods=["POST"])
@require_credentials
def start_thread() -> Tuple[Dict[str, Any], int]:
    """
    Start a new thread with introduction tweet.

    Creates the initial tweet that will serve as the root of the thread.

    Request Body:
        - intro_text: Introduction text for the thread (max 280 characters)

    Returns:
        JSON response with thread_id and tweet URL on success.
    """
    data = request.get_json() or {}
    intro_text = data.get("intro_text", "").strip()

    # Validate input
    if not intro_text:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "EMPTY_CONTENT",
                    "message": "Please enter some text for your thread introduction.",
                }
            ),
            400,
        )

    is_valid, error_msg = validate_tweet_length(intro_text, MAX_TWEET_LENGTH)
    if not is_valid:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "TWEET_TOO_LONG",
                    "message": error_msg or "Tweet exceeds maximum length.",
                }
            ),
            400,
        )

    try:
        client = TwitterClientManager.create_client(request.twitter_credentials)
        response = client.create_tweet(text=intro_text, reply_settings="mentionedUsers")

        thread_id = str(response.data["id"])
        session_id = get_session_id()
        progress_manager.save(0, thread_id, session_id)

        logger.info(f"Thread started: {thread_id}")

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Thread started successfully! You can now post Day 1.",
                    "data": {
                        "thread_id": thread_id,
                        "tweet_url": f"https://x.com/user/status/{thread_id}",
                    },
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Failed to start thread: {e}")
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/thread/continue", methods=["POST"])
@require_credentials
def continue_thread() -> Tuple[Dict[str, Any], int]:
    """
    Continue an existing thread by thread ID or URL.

    Validates the thread exists, belongs to the authenticated user,
    and determines the current day of progress by analyzing replies.

    Request Body:
        - thread_id: Thread ID or Twitter/X thread URL

    Returns:
        JSON response with thread_id, current_day, and next_day on success.
    """
    data = request.get_json() or {}
    # Accept both field names for compatibility
    thread_input = data.get("thread_id_or_url") or data.get("thread_id") or ""
    thread_input = thread_input.strip()

    if not thread_input:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "MISSING_THREAD_IDENTIFIER",
                    "message": "Please provide a thread ID or URL to continue.",
                }
            ),
            400,
        )

    # Extract thread ID from URL if provided
    thread_id = extract_thread_id_from_url(thread_input)
    if not thread_id:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "INVALID_THREAD_URL",
                    "message": "Invalid thread URL. Please provide a valid X/Twitter thread URL or thread ID.",
                }
            ),
            400,
        )

    # Validate thread ID format
    is_valid, error_msg = validate_thread_id(thread_id)
    if not is_valid:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "INVALID_THREAD_ID",
                    "message": error_msg or "Invalid thread ID format.",
                }
            ),
            400,
        )

    try:
        client = TwitterClientManager.create_client(request.twitter_credentials)

        # Get authenticated user to verify ownership
        me = client.get_me()
        user_id = str(me.data.id)
        username = me.data.username

        # Get the thread tweet to verify it exists and belongs to user
        try:
            tweet = client.get_tweet(
                id=thread_id,
                tweet_fields=["author_id", "created_at", "public_metrics", "in_reply_to_user_id"],
            )
        except Exception as e:
            error_str = str(e).lower()
            if "not found" in error_str or "404" in error_str:
                logger.warning(f"Thread not found: {thread_id}")
                return (
                    jsonify(
                        {
                            "success": False,
                            "error_code": "THREAD_NOT_FOUND",
                            "message": "Thread not found. Please check the thread ID or URL.",
                        }
                    ),
                    404,
                )
            raise

        # Verify the thread belongs to the authenticated user
        tweet_author_id = str(tweet.data.author_id)
        if tweet_author_id != user_id:
            logger.warning(
                f"Thread ownership mismatch: thread={thread_id}, user={user_id}, author={tweet_author_id}"
            )
            return (
                jsonify(
                    {
                        "success": False,
                        "error_code": "NOT_OWNER",
                        "message": "This thread doesn't belong to your account. Please use a thread you created.",
                    }
                ),
                403,
            )

        # Count replies in the thread to determine current day
        day = 0
        try:
            # Get replies to the thread
            replies = client.search_recent_tweets(
                query=f"conversation_id:{thread_id} from:{username}",
                max_results=MAX_REPLIES_TO_FETCH,
                tweet_fields=["created_at", "text"],
            )

            if replies.data:
                # Extract day numbers from replies
                day_numbers = []
                for reply in replies.data:
                    text = reply.text or ""
                    day_num = extract_day_from_text(text)
                    if day_num is not None:
                        day_numbers.append(day_num)

                # Use the highest day number found
                if day_numbers:
                    day = max(day_numbers)
                    logger.debug(f"Found day numbers: {day_numbers}, using max: {day}")
                else:
                    # If no Day pattern found, count all replies as days
                    day = len(replies.data)
                    logger.debug(f"No day pattern found, using reply count: {day}")
        except Exception as e:
            logger.warning(f"Failed to fetch replies for thread {thread_id}: {e}")
            # Continue with day 0 if we can't fetch replies

        # Save the thread ID and current day
        session_id = get_session_id()
        progress_manager.save(day, thread_id, session_id)
        logger.info(f"Thread continued: {thread_id}, day={day}")

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"Thread resumed! Found {day} day(s) of progress. Ready to post Day {day + 1}.",
                    "data": {
                        "thread_id": thread_id,
                        "current_day": day,
                        "next_day": day + 1,
                        "tweet_url": f"https://x.com/{username}/status/{thread_id}",
                    },
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Failed to continue thread: {e}")
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/solution/post", methods=["POST"])
@require_credentials
def post_solution() -> Tuple[Dict[str, Any], int]:
    """
    Post a solution to the active thread.

    Creates a reply tweet in the thread with the format:
    "Day {day}\n\n{problem_name}\n\n{gist_url}"

    Request Body:
        - gist_url: GitHub Gist URL for the solution
        - problem_name: Name of the LeetCode problem

    Returns:
        JSON response with tweet details on success.
    """
    data = request.get_json() or {}
    gist_url = data.get("gist_url", "").strip()
    problem_name = data.get("problem_name", "").strip()

    # Validate input
    if not gist_url:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "MISSING_GIST_URL",
                    "message": "Please provide a Gist URL for your solution.",
                }
            ),
            400,
        )

    if not problem_name:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "MISSING_PROBLEM_NAME",
                    "message": "Please provide the problem name.",
                }
            ),
            400,
        )

    # Load progress
    session_id = get_session_id()
    progress = progress_manager.load(session_id)
    thread_id = progress.get("thread_id")

    if not thread_id:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "NO_THREAD",
                    "message": "No active thread found. Please start a new thread first.",
                }
            ),
            400,
        )

    # Build tweet text
    day = progress.get("day", 0) + 1
    tweet_text = f"Day {day}\n\n{problem_name}\n\n{gist_url}"

    # Validate tweet length
    is_valid, error_msg = validate_tweet_length(tweet_text, MAX_TWEET_LENGTH)
    if not is_valid:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "TWEET_TOO_LONG",
                    "message": error_msg or "Tweet exceeds maximum length.",
                }
            ),
            400,
        )

    try:
        client = TwitterClientManager.create_client(request.twitter_credentials)
        response = client.create_tweet(text=tweet_text, in_reply_to_tweet_id=thread_id)

        tweet_id = str(response.data["id"])
        progress_manager.save(day, thread_id, session_id)

        logger.info(f"Solution posted: day={day}, tweet_id={tweet_id}, thread={thread_id}")

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"Day {day} posted successfully!",
                    "data": {
                        "day": day,
                        "tweet_id": tweet_id,
                        "tweet_url": f"https://x.com/user/status/{tweet_id}",
                        "tweet_text": tweet_text,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Failed to post solution: {e}")
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/tweet/preview", methods=["POST"])
@require_credentials
def preview_tweet() -> Tuple[Dict[str, Any], int]:
    """
    Preview what the tweet will look like without posting.

    Request Body:
        - gist_url: GitHub Gist URL for the solution
        - problem_name: Name of the LeetCode problem

    Returns:
        JSON response with tweet preview and validation info.
    """
    data = request.get_json() or {}
    gist_url = data.get("gist_url", "").strip()
    problem_name = data.get("problem_name", "").strip()

    session_id = get_session_id()
    progress = progress_manager.load(session_id)
    day = progress.get("day", 0) + 1

    tweet_text = f"Day {day}\n\n{problem_name}\n\n{gist_url}"
    character_count = len(tweet_text)
    is_valid = character_count <= MAX_TWEET_LENGTH

    return (
        jsonify(
            {
                "success": True,
                "data": {
                    "preview": tweet_text,
                    "character_count": character_count,
                    "is_valid": is_valid,
                    "day": day,
                },
            }
        ),
        200,
    )


@app.route("/api/user/info", methods=["GET"])
@require_credentials
def get_user_info() -> Tuple[Dict[str, Any], int]:
    """
    Get authenticated user information from Twitter.

    Returns:
        JSON response with user details (id, username, name, profile_image_url).
    """
    try:
        client = TwitterClientManager.create_client(request.twitter_credentials)
        user = client.get_me(user_fields=["profile_image_url", "username", "name"])

        profile_image_url = None
        if hasattr(user.data, "profile_image_url") and user.data.profile_image_url:
            profile_image_url = user.data.profile_image_url

        return (
            jsonify(
                {
                    "success": True,
                    "data": {
                        "id": str(user.data.id),
                        "username": user.data.username,
                        "name": user.data.name,
                        "profile_image_url": profile_image_url,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Failed to get user info: {e}")
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


# ============== ERROR HANDLERS ==============


@app.errorhandler(404)
def not_found(e) -> Tuple[Dict[str, Any], int]:
    """
    Handle 404 Not Found errors.

    Args:
        e: The error object.

    Returns:
        JSON error response.
    """
    logger.debug(f"404 error: {request.path}")
    return (
        jsonify(
            {
                "success": False,
                "error_code": "NOT_FOUND",
                "message": "The requested resource was not found.",
            }
        ),
        404,
    )


@app.errorhandler(500)
def server_error(e) -> Tuple[Dict[str, Any], int]:
    """
    Handle 500 Internal Server Error.

    Args:
        e: The error object.

    Returns:
        JSON error response.
    """
    logger.error(f"500 error: {e}")
    return (
        jsonify(
            {
                "success": False,
                "error_code": "SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
            }
        ),
        500,
    )


# ============== STATIC FILE SERVING ==============

if Config.FRONTEND_DIST_PATH.exists():
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path: str):
        """
        Serve frontend static files.

        Args:
            path: Request path.

        Returns:
            Static file or index.html for SPA routing.
        """
        # Don't serve frontend for API routes
        if path.startswith("api/"):
            return (
                jsonify(
                    {
                        "success": False,
                        "error_code": "NOT_FOUND",
                        "message": "The requested API resource was not found.",
                    }
                ),
                404,
            )

        if path and (Config.FRONTEND_DIST_PATH / path).exists():
            return send_from_directory(str(Config.FRONTEND_DIST_PATH), path)
        else:
            return send_from_directory(str(Config.FRONTEND_DIST_PATH), "index.html")


# ============== APPLICATION ENTRY POINT ==============


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("ThreadCraft API Server")
    logger.info("=" * 50)
    logger.info(f"Starting server on http://0.0.0.0:{Config.PORT}")
    logger.info(f"Debug mode: {Config.DEBUG}")
    app.run(debug=Config.DEBUG, host="0.0.0.0", port=Config.PORT)
