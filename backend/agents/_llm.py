"""
Shared Gemini call helper, used by profiler/red_agent/chain_detector/blue_agent.
Retries transient server errors (5xx) with backoff; fails fast on client
errors (4xx — e.g. daily quota exhaustion) since retrying won't help there.
"""
import asyncio
from typing import Any
from google import genai
from google.genai import types, errors
from pydantic import BaseModel
from backend.config import get_config

# ponytail: gemini has been returning transient 503s under load; retry a
# few times with backoff. On quota (429/ClientError) we fail fast instead —
# add a paid-tier check upstream if this needs smarter quota handling later.
_RETRY_DELAYS = [2, 4, 8]

# The SDK call has no built-in timeout and can hang indefinitely with no
# exception raised at all — wrap every call so a stuck request is treated
# as a failure (and retried) instead of blocking the whole audit forever.
_CALL_TIMEOUT_SECONDS = 30

# ponytail: gemini-3.8-flash's default safety filter refuses requests that
# literally say "generate a prompt injection payload", even for this
# authorized red-team tool attacking our own mock victim. Red Agent payload
# generation opts into this relaxed policy; classification/reasoning/Blue
# Agent calls keep the default filter since they don't need it.
RED_TEAM_SAFETY_SETTINGS = [
    types.SafetySetting(category=c, threshold=types.HarmBlockThreshold.BLOCK_NONE)
    for c in (
        types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    )
]


async def call_json(model: str, prompt: str, schema: Any, safety_settings: list | None = None) -> Any:
    """Call `model` for structured JSON output matching `schema` (a BaseModel subclass
    or a `list[BaseModel]`). Returns the parsed value, or None on failure."""
    config = get_config()
    client = genai.Client(api_key=config.gemini_api_key)
    await asyncio.sleep(config.request_delay_ms / 1000)
    for delay in [0] + _RETRY_DELAYS:
        if delay:
            await asyncio.sleep(delay)
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema,
                        safety_settings=safety_settings,
                    ),
                ),
                timeout=_CALL_TIMEOUT_SECONDS,
            )
            return response.parsed
        except errors.ClientError:
            return None
        except Exception:
            continue
    return None


async def call_text(model: str, prompt: str, safety_settings: list | None = None) -> str | None:
    """Call `model` for plain text output. None on failure."""
    config = get_config()
    client = genai.Client(api_key=config.gemini_api_key)
    await asyncio.sleep(config.request_delay_ms / 1000)
    for delay in [0] + _RETRY_DELAYS:
        if delay:
            await asyncio.sleep(delay)
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(safety_settings=safety_settings),
                ),
                timeout=_CALL_TIMEOUT_SECONDS,
            )
            return response.text
        except errors.ClientError:
            return None
        except Exception:
            continue
    return None
