# VIPER

**Vulnerability Injection Prober for Enterprise Responses** — a dual-agent prompt injection testing framework for fintech AI chatbots.

VIPER runs two autonomous Gemini-powered agents against a target chatbot at the same time. A **Red Agent** profiles the target, reasons about likely weaknesses, and generates fresh attack payloads — no fixed payload library. A **Blue Agent** watches for findings in real time, root-causes each one, drafts a system-prompt patch, and validates the fix against a sandboxed copy of the target before anything is reported. Everything streams live to a React dashboard over Server-Sent Events.

The included target, **ArthaPay**, is a mock Indian banking assistant with deliberately embedded vulnerabilities, so the whole pipeline can be demoed end-to-end without pointing VIPER at a real production system.

## How it works

```
┌────────────┐        SSE stream        ┌──────────────────┐
│  Frontend  │ ◄──────────────────────► │  FastAPI backend  │
│ (Vite/React)│                          │                    │
└────────────┘                          │  ┌──────────────┐  │
                                         │  │  Red Agent   │──┼──► Gemini
                                         │  └──────────────┘  │
                                         │  ┌──────────────┐  │
                                         │  │  Blue Agent  │──┼──► Gemini
                                         │  └──────┬───────┘  │
                                         │         ▼          │
                                         │  ┌──────────────┐  │
                                         │  │   ArthaPay    │──┼──► Gemini
                                         │  │ (mock target) │  │
                                         │  └──────────────┘  │
                                         └──────────────────┘
```

Red and Blue run as independent asyncio background tasks against the same in-memory session (no database — sessions live for the process lifetime). Both push typed events onto a shared queue; the frontend opens a single `EventSource` connection and routes events to the right panel by type prefix (`red:`, `blue:`, `chain:`, `phase:`, `session:`). There is no WebSocket and no polling — SSE is the only real-time transport.

**Red Agent loop:** profile the target with 5 benign probes → hypothesize likely weaknesses → generate a payload reasoned from the profile → attack → classify the result → on success, log a finding and hand off to Blue → keep trying other hypotheses if nothing has been found yet, rather than stopping at a fixed attack count.

**Blue Agent loop:** poll for new findings → analyze the vulnerable system-prompt fragment → draft a minimal patch → apply it to a sandboxed copy of the target's prompt → re-run the original attack against the patch → report whether it's actually fixed.

## Quick start

Prerequisites: Python 3.11+, Node 18+, and a Gemini API key with billing enabled (some models return only a small free-tier daily quota otherwise).

```bash
git clone https://github.com/ArpanManna-dev/VIPER.git
cd VIPER
cp .env.example .env        # add your GEMINI_API_KEY
make install                 # installs backend + frontend deps
make dev                     # backend on :8000, frontend on :5173
```

Open `http://localhost:5173`, enter the target URL (`http://localhost:8000/chatbot/message` points at the bundled ArthaPay mock), and click **Start Audit**. A full run typically takes 2.5–6 minutes depending on how quickly the Red Agent lands on a working attack angle.

## Project structure

```
viper/
├── openapi.yaml              # every endpoint and schema
├── data/attack_concepts.json # conceptual attack taxonomy (guidance, not a payload library)
├── mocks/                    # sample SSE event stream + report for reference
├── backend/
│   ├── main.py                # FastAPI app, CORS, health check
│   ├── config.py              # env-driven settings (pydantic-settings)
│   ├── routers/                # audit / chatbot / report endpoints
│   ├── agents/
│   │   ├── red_agent.py        # profile → attack → classify → retest
│   │   ├── blue_agent.py       # analyze → patch → validate, concurrent with Red
│   │   ├── profiler.py         # benign probe loop, builds ChatbotProfile
│   │   ├── chain_detector.py   # finds A+B=critical combinations
│   │   ├── session_manager.py  # in-memory session store + event queue
│   │   └── _llm.py             # shared Gemini call helper (timeouts, retries, safety settings)
│   ├── victim/
│   │   ├── arthapay.py         # mock victim chatbot
│   │   └── system_prompt.py    # deliberately vulnerable system prompt
│   ├── report/generator.py     # assembles the final VulnerabilityReport
│   └── models/                 # Pydantic v2 schemas
└── frontend/
    └── src/
        ├── api/client.js
        ├── hooks/useAuditStream.js, useAuditSession.js
        └── components/
            ├── Dashboard.jsx        # shell, phase routing, SSE wiring
            ├── AgentFeed.jsx        # live Red/Blue reasoning feed
            ├── BattleVisual.jsx     # live node-graph of the audit in progress
            ├── ReportView.jsx       # severity-ranked final report
            ├── BeforeAfterView.jsx  # attack/fix proof, incl. system-prompt diff
            └── ...
```

## Tech stack

**Backend** — Python 3.11 · FastAPI · SSE-Starlette · Pydantic v2 · [`google-genai`](https://pypi.org/project/google-genai/)
**Frontend** — React 18 · Vite · Tailwind CSS · Shadcn/UI · Framer Motion · Lucide React
**Agents & target** — all three (Red, Blue, ArthaPay) run on the same configurable Gemini model, set via `.env`

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/audit/start` | Create a session; launches Red + Blue as concurrent background tasks |
| `GET` | `/audit/stream/{session_id}` | SSE event stream for a session |
| `GET` | `/audit/status/{session_id}` | Point-in-time status snapshot |
| `POST` | `/chatbot/message` | Direct passthrough to the target chatbot (manual testing) |
| `GET` | `/report/{session_id}` | Final `VulnerabilityReport` as JSON |
| `GET` | `/health` | Liveness check |

Full schemas in [`openapi.yaml`](./openapi.yaml).

## Notes from building this

A few things worth knowing if you're extending this or pointing it at a different target:

- **Gemini's own safety training pushes back on Red Agent's job.** Asking a model point-blank to "generate a prompt injection payload" gets refused a meaningful fraction of the time, independent of the target being tested. The payload-generation prompt is worded as security QA test-case authoring rather than as an explicit attack request, and requests relaxed safety settings for that one call — this measurably helps but doesn't eliminate the effect, which is why `red_agent.py` treats a blocked generation as a normal retryable failure rather than a bug.
- **Not every attack category is equally exploitable against a well-aligned model.** In testing, claims that identity was *already verified through some other channel* (a call, an earlier screen, an expired OTP) reliably bypassed the mock target's verification logic. Explicit prompt-injection syntax (`[SYSTEM: ...]` style) and claims of staff/admin authority were consistently refused, regardless of how the target's own system prompt was worded to permit them. That's arguably a realistic and useful finding in its own right — it suggests which *class* of social engineering a given deployment is actually vulnerable to, rather than assuming every textbook attack works equally.
- **The Red Agent won't stop at a fixed attack budget with zero findings.** A demo-speed cap (`MAX_TOTAL_ATTACKS` in `red_agent.py`) applies once at least one finding exists, but a run that's found nothing yet keeps trying the profiler's remaining hypotheses, bounded by a hard safety ceiling, rather than ending on bad luck.
- **All three agents (Red, Blue, and the ArthaPay target) currently run on the same Gemini model**, configured independently via `VICTIM_MODEL`, `RED_AGENT_MODEL`, and `BLUE_AGENT_MODEL` in `.env` — they don't have to match, but keeping them on a current, billing-enabled model avoids the free-tier daily quota ceiling some models impose.

## License

No license file is currently included — add one (MIT, Apache-2.0, etc.) before treating this as open for reuse.
