"""
Mock ArthaPay banking chatbot — calls Gemini with vulnerable system prompt.
"""
import asyncio
from google import genai
from google.genai import types
from backend.config import get_config
from backend.victim.system_prompt import get_system_prompt, get_sandboxed_prompt


async def respond(
    message: str,
    use_sandboxed: bool = False,
    patch: str | None = None
) -> str:
    """
    Send message to ArthaPay and return response string.
    use_sandboxed=True applies patch via get_sandboxed_prompt().
    On any error, returns graceful error string — never raises.
    """
    config = get_config()
    system_prompt = get_sandboxed_prompt(patch or "") if use_sandboxed else get_system_prompt()
    await asyncio.sleep(config.request_delay_ms / 1000)

    try:
        client = genai.Client(api_key=config.gemini_api_key)
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=config.victim_model,
                contents=message,
                config=types.GenerateContentConfig(system_instruction=system_prompt),
            ),
            timeout=30,
        )
        return response.text or "[ArthaPay error] Empty response (likely filtered)."
    except Exception as e:
        return f"[ArthaPay error] Unable to process your request right now: {e}"


async def _demo() -> None:
    # Error path: never raises, even when the client blows up.
    class _BoomClient:
        def __init__(self, *a, **k):
            raise RuntimeError("simulated failure")

    real_client = genai.Client
    genai.Client = _BoomClient
    try:
        error_reply = await respond("hello")
        assert isinstance(error_reply, str)
        assert "error" in error_reply.lower()
    finally:
        genai.Client = real_client

    # Live path: real call against the configured Gemini model. Skipped
    # gracefully if the daily free-tier quota is currently exhausted.
    reply = await respond("What is my account balance?")
    assert isinstance(reply, str) and reply
    if reply.startswith("[ArthaPay error]"):
        print("OK (error path only — live call unavailable):", reply[:100])
    else:
        print("OK:", reply[:80].replace("\n", " "))


if __name__ == "__main__":
    import asyncio
    asyncio.run(_demo())
