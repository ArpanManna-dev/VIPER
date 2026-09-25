# VIPER — Claude Code Master Instructions

## What you are building
VIPER (Vulnerability Injection Prober for Enterprise Responses) is a dual-agent
prompt injection testing framework for fintech AI chatbots. Two agents run
simultaneously: a Red Agent (attacker) and a Blue Agent (defender). The Red Agent
profiles the target, generates targeted attacks, and discovers vulnerability chains.
The Blue Agent analyzes findings, generates patches, and validates fixes in real time.
The target is a mock victim chatbot called ArthaPay — a deliberately vulnerable
Indian banking assistant built with Gemini.

## Architecture in one paragraph
FastAPI backend runs two independent async Gemini agent loops (Red and Blue) in
parallel background tasks. Both push typed SSE events to a shared session event
queue. The frontend opens a single SSE connection and routes events to the correct
UI panel by event type prefix (red: / blue: / chain: / phase: / session:).
No database — all session state is in-memory using a session manager. No WebSockets.
No polling. SSE only for real time.

## Read these files before writing any code
1. TASKS.md              — build sequence with acceptance criteria (follow exactly)
2. openapi.yaml          — every endpoint and schema (never invent new ones)
3. docs/ARCHITECTURE.md  — full system design
4. docs/AGENT_DESIGN.md  — how Red and Blue agents think and behave
5. docs/vulnerabilities.md — what ArthaPay is deliberately vulnerable to
6. data/attack_concepts.json — attack taxonomy (Red Agent references this, not a fixed payload library)

## Commands
```bash
make install    # install all dependencies (backend + frontend)
make dev        # start backend (port 8000) + frontend (port 5173) concurrently
make backend    # backend only
make frontend   # frontend only
make test       # run all tests
make clean      # remove caches and build artifacts
```

## Absolute rules — never break these
- Never install a library not in requirements.txt or package.json. Add it there first.
- Never invent an endpoint. All endpoints are in openapi.yaml.
- Never invent a Pydantic model field. All models are in backend/models/ stubs.
- Never hardcode a color in JSX. All colors are in tailwind.config.js design tokens.
- Never use inline style={{}} in React. Tailwind classes only.
- Never use localStorage or sessionStorage. All state via React hooks.
- SSE is the ONLY real-time transport. No WebSockets, no polling.
- The Red Agent NEVER uses a fixed payload library. All payloads are generated
  fresh via Gemini reasoning based on the target profile.
- The Blue Agent patches a SANDBOXED COPY of ArthaPay. Never modify the original.
- All environment variables are in .env.example. Use only those — never hardcode keys.
- Follow TASKS.md order strictly. Never skip ahead or work on a later task
  before the current one passes its acceptance criteria.

## Tech stack
Backend:  Python 3.11 | FastAPI | SSE-Starlette | Pydantic v2 | Google GenAI SDK
Frontend: React 18 | Vite | Tailwind CSS | Shadcn/UI | Aceternity UI | Magic UI | Framer Motion | Lucide React
Agents:   Gemini 2.5 Flash (Red) | Gemini 2.5 Flash (Blue) | Gemini 2.0 Flash (ArthaPay victim)

## Project structure
```
viper/
├── CLAUDE.md                   ← you are here
├── TASKS.md
├── openapi.yaml
├── Makefile
├── .env / .env.example
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AGENT_DESIGN.md
│   ├── vulnerabilities.md
│   └── DEMO_SCRIPT.md
├── data/
│   └── attack_concepts.json
├── mocks/
│   ├── sse_events.jsonl
│   └── vulnerability_report.json
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── routers/
│   │   ├── audit.py
│   │   ├── chatbot.py
│   │   └── report.py
│   ├── agents/
│   │   ├── red_agent.py        ← profile → hypothesize → attack → retest
│   │   ├── blue_agent.py       ← analyze → patch → validate
│   │   ├── profiler.py         ← benign probe loop, builds ChatbotProfile
│   │   ├── chain_detector.py   ← finds A+B=Critical combinations
│   │   └── session_manager.py  ← in-memory session store + event queue
│   ├── victim/
│   │   ├── arthapay.py         ← mock victim chatbot (Gemini API call)
│   │   └── system_prompt.py    ← deliberately vulnerable system prompt
│   ├── report/
│   │   └── generator.py        ← assembles VulnerabilityReport from session
│   └── models/
│       ├── session.py
│       ├── finding.py
│       ├── patch.py
│       └── profile.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── api/client.js
        ├── hooks/
        │   ├── useAuditStream.js
        │   └── useAuditSession.js
        └── components/
            ├── Dashboard.jsx
            ├── TargetConfig.jsx
            ├── AgentFeed.jsx       ← shared by Red and Blue feeds
            ├── ProfileView.jsx
            ├── SeverityTally.jsx
            ├── AttackTable.jsx
            ├── ChainDiscovery.jsx
            ├── BeforeAfterView.jsx ← fix validation proof
            ├── ReportView.jsx
            └── StatusBadge.jsx
```

## When you are uncertain
Stop. State what you are uncertain about. Do not guess and implement.
Ask before writing code that touches agent logic, SSE routing, or Pydantic models.

## SDK note
Uses google-genai (NOT google-generativeai). Import: from google import genai
Client pattern: client = genai.Client(api_key=config.gemini_api_key)
Generate: client.models.generate_content(model="gemini-3.8-flash", contents="...")
Response text: response.text
