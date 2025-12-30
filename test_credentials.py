import tweepy
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("TWITTER_API_KEY")
API_SECRET = os.getenv("TWITTER_API_SECRET")
ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
ACCESS_TOKEN_SECRET = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

print("Checking credentials...")
print(f"API Key: {API_KEY[:10]}... (exists: {bool(API_KEY)})")
print(f"API Secret: {API_SECRET[:10]}... (exists: {bool(API_SECRET)})")
print(f"Access Token: {ACCESS_TOKEN[:10]}... (exists: {bool(ACCESS_TOKEN)})")
print(f"Access Token Secret: {ACCESS_TOKEN_SECRET[:10]}... (exists: {bool(ACCESS_TOKEN_SECRET)})")
print(f"Bearer Token: {BEARER_TOKEN[:10]}... (exists: {bool(BEARER_TOKEN)})")

print("\nTesting authentication...")
try:
    client = tweepy.Client(
        bearer_token=BEARER_TOKEN,
        consumer_key=API_KEY,
        consumer_secret=API_SECRET,
        access_token=ACCESS_TOKEN,
        access_token_secret=ACCESS_TOKEN_SECRET
    )
    
    # Try to get authenticated user
    me = client.get_me()
    print(f"Authentication successful!")
    print(f"Logged in as: @{me.data.username}")
    
except Exception as e:
    print(f"Authentication failed: {e}")