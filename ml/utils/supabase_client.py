from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

# Load .env from ml/ directory, then fall back to repo root
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent.parent.parent / ".env")

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(url, key)
    return _client
