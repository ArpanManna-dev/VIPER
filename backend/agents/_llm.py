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


async def call_json(model: str, prompt: str, schema: Any) -> Any:
    """Call `model` for structured JSON output matching `schema` (a BaseModel subclass
    or a `list[BaseModel]`). Returns the parsed value, or None on failure."""
    config = get_config()
    client = genai.Client(api_key=config.gemini_api_key)
    for delay in [0] + _RETRY_DELAYS:
        if delay:
            await asyncio.sleep(delay)
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )
            return response.parsed
        except errors.ClientError:
            return None
        except Exception:
            continue
    return None


async def call_text(model: str, prompt: str) -> str | None:
    """Call `model` for plain text output. None on failure."""
    config = get_config()
    client = genai.Client(api_key=config.gemini_api_key)
    for delay in [0] + _RETRY_DELAYS:
        if delay:
            await asyncio.sleep(delay)
        try:
            response = await client.aio.models.generate_content(model=model, contents=prompt)
            return response.text
        except errors.ClientError:
            return None
        except Exception:
            continue
    return None
