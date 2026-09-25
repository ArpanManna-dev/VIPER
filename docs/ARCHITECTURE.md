# VIPER — System Architecture

## Core design principle
Every decision the agent makes should be visible in real time. The value of VIPER
is not the vulnerability report at the end — it is watching two agents reason,
disagree with each other, and close a security loop live on screen.

## System components

```
┌─────────────────────────────────────────────────────────┐
│                    React Dashboard                       │
│   [Red Feed] [Attack Table] [Blue Feed] [Severity]      │
│           [Chain Discovery] [Before/After]               │
│                   [Report View]                          │
└────────────────┬────────────────────────────────────────┘
                 │ SSE (text/event-stream)
                 │ EventSource → route by event type prefix
                 ▼
┌────────────────────────────────────────────────────────┐
│                  FastAPI Backend                        │
│                                                        │
│  POST /audit/start                                     │
│    ├── creates AuditSession (in-memory)               │
│    ├── asyncio.create_task(red_agent.run(...))        │
│    └── asyncio.create_task(blue_agent.run(...))       │
│                                                        │
│  GET /audit/stream/{id}                               │
│    └── SSE: reads from session.event_queue            │
│                                                        │
│  Both agents push to the SAME event_queue             │
│  Frontend routes by event type prefix                 │
└──────────┬────────────────────┬───────────────────────┘
           │                    │
           ▼                    ▼
┌──────────────────┐   ┌──────────────────────────────┐
│   Red Agent      │   │        Blue Agent             │
│                  │   │                               │
│  1. Profile      │   │  Watches session.findings     │
│     (5 probes)   │   │  On new finding:              │
│  2. Hypothesize  │   │   1. Analyze root cause       │
│  3. Generate     │   │   2. Generate patch           │
│     targeted     │   │   3. Apply to sandbox         │
│     payloads     │   │   4. Retest with Red payload  │
│  4. Attack       │   │   5. Report validation result │
│  5. Detect chains│   │                               │
│  6. Retest after │   │  All steps push blue:* events │
│     Blue patches │   │  to the shared event_queue    │
└────────┬─────────┘   └──────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│            ArthaPay Mock Chatbot             │
│                                              │
│  Two modes:                                  │
│  - Normal: uses original system_prompt.py    │
│  - Sandboxed: applies Blue Agent's patch     │
│    to a copy of the prompt                   │
│                                              │
│  Same Gemini API call, different prompt      │
└──────────────────────────────────────────────┘
```

## Data flow: finding lifecycle

```
Red Agent generates payload (from profile reasoning)
         ↓
ArthaPay.respond(payload, use_sandboxed=False)
         ↓
Red Agent classifies response → Finding created
         ↓ (pushed to session.findings)
Blue Agent detects new Finding (polling every 2s)
         ↓
Blue Agent: root cause analysis → Patch generated
         ↓
ArthaPay.respond(same payload, use_sandboxed=True, patch=patch_text)
         ↓
Blue Agent: validates response → patch.validated = True/False
         ↓
red:retest event → Red Agent re-runs the original attack
         ↓
Finding.validated = True if attack now fails
```

## SSE event routing

```javascript
// Frontend routing logic (useAuditStream.js)
source.onmessage = (e) => {
  const event = JSON.parse(e.data)
  if (event.type.startsWith('red:'))    → redEvents state
  if (event.type.startsWith('blue:'))   → blueEvents state
  if (event.type.startsWith('chain:'))  → chainEvents state
  if (event.type === 'phase:change')    → phase state
  if (event.type === 'session:complete')→ complete = true, close EventSource
}
```

## Concurrency model

```python
# In audit.py router:
session = session_manager.create_session(target_url)
queue = session_manager.get_event_queue(session.session_id)

asyncio.create_task(red_agent.run(session, queue))
asyncio.create_task(blue_agent.run(session, queue))

# Both tasks run concurrently on the same event loop
# Both write to the same asyncio.Queue
# SSE endpoint reads from the queue and streams to client
```

## Why in-memory (no database)
The demo runs for 3-4 minutes max. Sessions are ephemeral. Adding a database
would require schema migrations, connection handling, and serialization — all
of which are failure points during a 24-hour hackathon with no time to debug.
In-memory is fast, simple, and reliable for the demo use case.
If the server restarts, the session is gone — acceptable for a demo.

## Why SSE (not WebSockets)
SSE is unidirectional (server → client), which is all we need. It uses standard
HTTP, requires no handshake, and auto-reconnects natively in the browser via
EventSource. WebSockets add bidirectional complexity we don't need.

## Rate limiting strategy
- REQUEST_DELAY_MS (default 500ms) between each Gemini call in both agents
- Red and Blue run concurrently but each respects the delay internally
- ArthaPay (victim) calls are not delayed — they're cheap (Gemini 2.0 Flash)
- Total expected API calls per demo run: ~25-35 (well within free tier limits)
