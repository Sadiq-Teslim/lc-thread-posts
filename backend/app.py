"""
Flask API Backend for ThreadCraft
Secure, production-ready API that bridges frontend to Twitter/X functionality
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from functools import wraps
import tweepy
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
import base64

app = Flask(__name__, static_folder=None)
# Configure CORS
# In production, set ALLOWED_ORIGINS env var to comma-separated list of frontend URLs
# For example: ALLOWED_ORIGINS=https://example.com,https://www.example.com
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else None
CORS(app, supports_credentials=True, origins=allowed_origins if allowed_origins else "*")

# Serve frontend static files in production (optional)
FRONTEND_DIST_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "frontend", "dist"
)
if os.path.exists(FRONTEND_DIST_PATH):
    app.static_folder = FRONTEND_DIST_PATH

# Configuration
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(32))
PROGRESS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "progress.json"
)

# In-memory session storage (in production, use Redis or database)
active_sessions = {}


def generate_encryption_key(session_id: str) -> bytes:
    """Generate a Fernet encryption key from session ID"""
    key = hashlib.sha256(session_id.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_credentials(credentials: dict, session_id: str) -> str:
    """Encrypt credentials for secure storage"""
    key = generate_encryption_key(session_id)
    f = Fernet(key)
    return f.encrypt(json.dumps(credentials).encode()).decode()


def decrypt_credentials(encrypted_data: str, session_id: str) -> dict:
    """Decrypt credentials"""
    key = generate_encryption_key(session_id)
    f = Fernet(key)
    return json.loads(f.decrypt(encrypted_data.encode()).decode())


def get_session_id():
    """Get session ID from request header"""
    return request.headers.get("X-Session-ID")


def require_credentials(f):
    """Decorator to require valid credentials for API endpoints"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = get_session_id()

        if not session_id:
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

        if session_id not in active_sessions:
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

        session = active_sessions[session_id]

        # Check session expiry (24 hours)
        if datetime.now() > session["expires_at"]:
            del active_sessions[session_id]
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
            credentials = decrypt_credentials(
                session["encrypted_credentials"], session_id
            )
            request.twitter_credentials = credentials
        except Exception:
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


def get_twitter_client(credentials: dict):
    """Create Twitter client with provided credentials"""
    return tweepy.Client(
        bearer_token=credentials.get("bearer_token"),
        consumer_key=credentials.get("api_key"),
        consumer_secret=credentials.get("api_secret"),
        access_token=credentials.get("access_token"),
        access_token_secret=credentials.get("access_token_secret"),
    )


def load_progress():
    """Load progress from JSON file"""
    try:
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"day": 0, "thread_id": None}


def save_progress(day: int, thread_id: str):
    """Save progress to JSON file"""
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"day": day, "thread_id": thread_id}, f, indent=2)


def friendly_error_message(error: Exception) -> tuple:
    """Convert technical errors to user-friendly messages"""
    error_str = str(error).lower()

    if "unauthorized" in error_str or "401" in error_str:
        return (
            "AUTHENTICATION_FAILED",
            "Your X/Twitter API credentials appear to be invalid. Please check your API keys in settings.",
        )
    elif "forbidden" in error_str or "403" in error_str:
        return (
            "PERMISSION_DENIED",
            "Your X/Twitter account does not have permission for this action. Please check your app permissions on the Twitter Developer Portal.",
        )
    elif "rate limit" in error_str or "429" in error_str:
        return (
            "RATE_LIMITED",
            "You've hit the X/Twitter rate limit. Please wait a few minutes before trying again.",
        )
    elif "duplicate" in error_str:
        return (
            "DUPLICATE_TWEET",
            "This tweet appears to be a duplicate. Please modify your content and try again.",
        )
    elif "too long" in error_str or "character" in error_str:
        return (
            "TWEET_TOO_LONG",
            "Your tweet is too long. Please shorten it to 280 characters or less.",
        )
    elif "connection" in error_str or "timeout" in error_str:
        return (
            "CONNECTION_ERROR",
            "Unable to connect to X/Twitter. Please check your internet connection and try again.",
        )
    else:
        return (
            "UNKNOWN_ERROR",
            "Something went wrong while posting. Please try again or check your settings.",
        )


# ============== API ENDPOINTS ==============


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify(
        {"success": True, "status": "healthy", "timestamp": datetime.now().isoformat()}
    )


@app.route("/api/session/create", methods=["POST"])
def create_session():
    """Create a new session and store encrypted credentials"""
    data = request.get_json()

    required_fields = [
        "api_key",
        "api_secret",
        "access_token",
        "access_token_secret",
        "bearer_token",
    ]
    missing_fields = [f for f in required_fields if not data.get(f)]

    if missing_fields:
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
    try:
        client = get_twitter_client(data)
        # Try to get authenticated user to validate credentials
        client.get_me()
    except Exception as e:
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            400,
        )

    # Generate session ID
    session_id = secrets.token_urlsafe(32)

    # Encrypt and store credentials
    encrypted_creds = encrypt_credentials(data, session_id)

    active_sessions[session_id] = {
        "encrypted_credentials": encrypted_creds,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24),
    }

    return jsonify(
        {
            "success": True,
            "session_id": session_id,
            "message": "Successfully connected to X/Twitter! You can now start posting.",
            "expires_in": 86400,  # 24 hours in seconds
        }
    )


@app.route("/api/session/validate", methods=["GET"])
def validate_session():
    """Validate if current session is still active"""
    session_id = get_session_id()

    if not session_id or session_id not in active_sessions:
        return jsonify(
            {
                "success": False,
                "valid": False,
                "message": "No active session found. Please configure your API keys.",
            }
        )

    session = active_sessions[session_id]

    if datetime.now() > session["expires_at"]:
        del active_sessions[session_id]
        return jsonify(
            {
                "success": False,
                "valid": False,
                "message": "Your session has expired. Please reconfigure your API keys.",
            }
        )

    return jsonify(
        {
            "success": True,
            "valid": True,
            "expires_at": session["expires_at"].isoformat(),
            "message": "Session is active.",
        }
    )


@app.route("/api/session/destroy", methods=["DELETE"])
def destroy_session():
    """Destroy current session (logout)"""
    session_id = get_session_id()

    if session_id and session_id in active_sessions:
        del active_sessions[session_id]

    return jsonify(
        {
            "success": True,
            "message": "Session ended. Your credentials have been securely removed.",
        }
    )


@app.route("/api/progress", methods=["GET"])
@require_credentials
def get_progress():
    """Get current posting progress"""
    progress = load_progress()
    return jsonify(
        {
            "success": True,
            "data": {
                "current_day": progress.get("day", 0),
                "thread_id": progress.get("thread_id"),
                "has_active_thread": progress.get("thread_id") is not None,
                "next_day": progress.get("day", 0) + 1,
            },
        }
    )


@app.route("/api/progress/reset", methods=["POST"])
@require_credentials
def reset_progress():
    """Reset progress to start a new thread"""
    save_progress(0, None)
    return jsonify(
        {
            "success": True,
            "message": "Progress has been reset. You can now start a new thread.",
        }
    )


@app.route("/api/thread/start", methods=["POST"])
@require_credentials
def start_thread():
    """Start a new thread with introduction tweet"""
    data = request.get_json()
    intro_text = data.get("intro_text", "").strip()

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

    if len(intro_text) > 280:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "TWEET_TOO_LONG",
                    "message": f"Your introduction is {len(intro_text)} characters. Please keep it under 280 characters.",
                }
            ),
            400,
        )

    try:
        client = get_twitter_client(request.twitter_credentials)

        response = client.create_tweet(text=intro_text, reply_settings="mentionedUsers")

        thread_id = response.data["id"]
        save_progress(0, thread_id)

        return jsonify(
            {
                "success": True,
                "message": "Thread started successfully! You can now post Day 1.",
                "data": {
                    "thread_id": thread_id,
                    "tweet_url": f"https://x.com/user/status/{thread_id}",
                },
            }
        )

    except Exception as e:
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/thread/continue", methods=["POST"])
@require_credentials
def continue_thread():
    """Continue an existing thread by thread ID or URL"""
    data = request.get_json()
    thread_input = data.get("thread_id", "").strip()

    if not thread_input:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "MISSING_THREAD_ID",
                    "message": "Please provide a thread ID or URL.",
                }
            ),
            400,
        )

    # Extract thread ID from URL if provided
    thread_id = thread_input
    if "x.com" in thread_input or "twitter.com" in thread_input:
        # Extract ID from URL like https://x.com/username/status/1234567890
        parts = thread_input.split("/")
        thread_id = parts[-1] if parts else thread_input
        # Remove query params if any
        thread_id = thread_id.split("?")[0]

    try:
        client = get_twitter_client(request.twitter_credentials)
        
        # Get authenticated user to verify ownership
        me = client.get_me()
        user_id = me.data.id

        # Get the thread tweet to verify it exists and belongs to user
        try:
            tweet = client.get_tweet(
                id=thread_id,
                tweet_fields=["author_id", "created_at", "public_metrics", "in_reply_to_user_id"]
            )
        except Exception as e:
            if "not found" in str(e).lower() or "404" in str(e).lower():
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
        if str(tweet.data.author_id) != str(user_id):
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
        # Get replies to the thread
        day = 0  # Start at 0 if no replies found
        try:
            # Get replies to the thread
            replies = client.search_recent_tweets(
                query=f"conversation_id:{thread_id} from:{me.data.username}",
                max_results=100,
                tweet_fields=["created_at", "text"]
            )
            
            if replies.data:
                # Filter for replies that follow the "Day X" pattern
                day_patterns = []
                for reply in replies.data:
                    text = reply.text or ""
                    # Look for "Day X" pattern
                    import re
                    match = re.search(r'Day\s+(\d+)', text, re.IGNORECASE)
                    if match:
                        day_num = int(match.group(1))
                        day_patterns.append(day_num)
                
                # Use the highest day number found
                if day_patterns:
                    day = max(day_patterns)
                else:
                    # If no Day pattern found, count all replies
                    day = len(replies.data)
        except Exception:
            # If we can't fetch replies, assume day 0 and let user continue
            day = 0

        # Save the thread ID and current day
        save_progress(day, thread_id)

        return jsonify(
            {
                "success": True,
                "message": f"Thread resumed! Found {day} day(s) of progress. Ready to post Day {day + 1}.",
                "data": {
                    "thread_id": thread_id,
                    "current_day": day,
                    "next_day": day + 1,
                    "tweet_url": f"https://x.com/user/status/{thread_id}",
                },
            }
        )

    except Exception as e:
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/solution/post", methods=["POST"])
@require_credentials
def post_solution():
    """Post a LeetCode solution to the thread"""
    data = request.get_json()
    gist_url = data.get("gist_url", "").strip()
    problem_name = data.get("problem_name", "").strip()

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

    progress = load_progress()
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

    day = progress.get("day", 0) + 1
    tweet_text = f"Day {day}\n\n{problem_name}\n\n{gist_url}"

    if len(tweet_text) > 280:
        return (
            jsonify(
                {
                    "success": False,
                    "error_code": "TWEET_TOO_LONG",
                    "message": f"Your tweet is {len(tweet_text)} characters. Please shorten the problem name.",
                }
            ),
            400,
        )

    try:
        client = get_twitter_client(request.twitter_credentials)

        response = client.create_tweet(text=tweet_text, in_reply_to_tweet_id=thread_id)

        save_progress(day, thread_id)

        return jsonify(
            {
                "success": True,
                "message": f"Day {day} posted successfully!",
                "data": {
                    "day": day,
                    "tweet_id": response.data["id"],
                    "tweet_url": f'https://x.com/user/status/{response.data["id"]}',
                    "tweet_text": tweet_text,
                },
            }
        )

    except Exception as e:
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


@app.route("/api/tweet/preview", methods=["POST"])
@require_credentials
def preview_tweet():
    """Preview what the tweet will look like"""
    data = request.get_json()
    gist_url = data.get("gist_url", "").strip()
    problem_name = data.get("problem_name", "").strip()

    progress = load_progress()
    day = progress.get("day", 0) + 1

    tweet_text = f"Day {day}\n\n{problem_name}\n\n{gist_url}"

    return jsonify(
        {
            "success": True,
            "data": {
                "preview": tweet_text,
                "character_count": len(tweet_text),
                "is_valid": len(tweet_text) <= 280,
                "day": day,
            },
        }
    )


@app.route("/api/user/info", methods=["GET"])
@require_credentials
def get_user_info():
    """Get authenticated user info"""
    try:
        client = get_twitter_client(request.twitter_credentials)
        user = client.get_me(user_fields=["profile_image_url", "username", "name"])

        return jsonify(
            {
                "success": True,
                "data": {
                    "id": user.data.id,
                    "username": user.data.username,
                    "name": user.data.name,
                    "profile_image_url": (
                        user.data.profile_image_url
                        if hasattr(user.data, "profile_image_url")
                        else None
                    ),
                },
            }
        )

    except Exception as e:
        error_code, message = friendly_error_message(e)
        return (
            jsonify({"success": False, "error_code": error_code, "message": message}),
            500,
        )


# Error handlers
@app.errorhandler(404)
def not_found(e):
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
def server_error(e):
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


# Serve frontend static files (for combined deployment)
# IMPORTANT: This must be last so API routes are matched first
if os.path.exists(FRONTEND_DIST_PATH):
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        # Don't serve frontend for API routes
        if path.startswith("api/"):
            return jsonify({
                "success": False,
                "error_code": "NOT_FOUND",
                "message": "The requested API resource was not found.",
            }), 404
        
        if path != "" and os.path.exists(os.path.join(FRONTEND_DIST_PATH, path)):
            return send_from_directory(FRONTEND_DIST_PATH, path)
        else:
            return send_from_directory(FRONTEND_DIST_PATH, "index.html")


if __name__ == "__main__":
    print("=" * 50)
    print("ThreadCraft API Server")
    print("=" * 50)
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    print(f"Starting server on http://0.0.0.0:{port}")
    app.run(debug=debug, host="0.0.0.0", port=port)
