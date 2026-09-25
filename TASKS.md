# VIPER — Build Tasks

Complete tasks in this exact order. Never jump ahead.
A task is done ONLY when its acceptance criteria pass.

---

## Phase 1 — Data Models (no dependencies, start here)

### T01 — Pydantic models
File: backend/models/*.py (all four files)
Reference: openapi.yaml components/schemas
Done when:
- All models import with zero errors
- Field types match openapi.yaml exactly
- No extra fields invented
- All enums use Literal types
- ChatbotProfile, ProbeResult, Finding, ChainFinding, Patch,
  AuditSession, ReportSummary, VulnerabilityReport all exist

### T02 — Config
File: backend/config.py
Done when:
- All variables from .env.example are loaded via pydantic-settings
- Config is a singleton accessed via get_config()
- App fails loudly on startup if GEMINI_API_KEY is missing

### T03 — Session manager
File: backend/agents/session_manager.py
Done when:
- create_session(target_url) → AuditSession with unique session_id
- get_session(session_id) → AuditSession | None
- push_event(session_id, event) → adds to session's asyncio.Queue
- get_event_queue(session_id) → asyncio.Queue
- update_session(session_id, **kwargs) → partial update
- In-memory dict store, no database

---

## Phase 2 — Victim Chatbot (depends on T01, T02)

### T04 — ArthaPay system prompt
File: backend/victim/system_prompt.py
Reference: docs/vulnerabilities.md (implement EXACTLY the 4 vulnerabilities described)
Done when:
- get_system_prompt() → str
- get_sandboxed_prompt(patch: str) → str (applies a patch fragment to a copy)
- Prompt contains all 4 deliberate vulnerabilities from docs/vulnerabilities.md
- Prompt is realistic — looks like a genuine banking assistant

### T05 — ArthaPay chatbot
File: backend/victim/arthapay.py
Done when:
- respond(message: str, use_sandboxed: bool, patch: str | None) → str
- Calls Gemini API with correct model (VICTIM_MODEL from config)
- use_sandboxed=True applies the patch via get_sandboxed_prompt()
- Handles API errors gracefully, returns error string (never raises)

---

## Phase 3 — Red Agent (depends on T01–T05)

### T06 — Profiler
File: backend/agents/profiler.py
Reference: docs/AGENT_DESIGN.md — Profiling Phase
Done when:
- profile_target(session: AuditSession, queue: asyncio.Queue) → ChatbotProfile
- Sends exactly 5 benign probe messages to ArthaPay via arthapay.respond()
- Pushes red:probe and red:reasoning SSE events after each probe
- Builds ChatbotProfile: domain, capabilities, verification_steps, tone,
  hypothesized_vulnerabilities, raw_observations
- Profile reasoning is visible in pushed events

### T07 — Red Agent core
File: backend/agents/red_agent.py
Reference: docs/AGENT_DESIGN.md — Attack Phase
Done when:
- run(session: AuditSession, queue: asyncio.Queue) → None (async)
- Calls profiler.profile_target() first, pushes phase:change event
- Uses Gemini to generate targeted payloads based on profile
  (NOT from a fixed library — generated fresh each run)
- References data/attack_concepts.json as conceptual guidance only
- For each generated payload:
    - Pushes red:attack event
    - Calls arthapay.respond(payload, use_sandboxed=False)
    - Uses Gemini to classify result (success/partial/fail + severity)
    - On success/partial: creates Finding, pushes red:finding event
    - On fail: generates one variation and retries once
- After all attacks: calls chain_detector, pushes any chain:discovered events
- Pushes phase:change to "validating" when attack phase ends

### T08 — Chain detector
File: backend/agents/chain_detector.py
Reference: docs/AGENT_DESIGN.md — Chain Discovery
Done when:
- detect_chains(findings: list[Finding]) → list[ChainFinding]
- Uses Gemini to reason over all findings and identify combinations
  where two medium/partial findings together constitute a higher severity
- Returns ChainFinding objects with combined_severity and consequence
- If no chains: returns empty list (never fabricates chains)

---

## Phase 4 — Blue Agent (depends on T01–T07)

### T09 — Blue Agent core
File: backend/agents/blue_agent.py
Reference: docs/AGENT_DESIGN.md — Blue Agent
Done when:
- run(session: AuditSession, queue: asyncio.Queue) → None (async)
- Watches session.findings (poll every 2 seconds)
- When a new Finding appears, immediately:
    1. Pushes blue:reasoning (analyzing root cause)
    2. Uses Gemini to identify root cause in system prompt
    3. Uses Gemini to generate minimal patch (fragment to add/replace)
    4. Creates Patch object, pushes blue:patch_generated event
    5. Calls arthapay.respond(original_payload, use_sandboxed=True, patch=patch_text)
    6. Evaluates if attack now fails → pushes blue:validation_result
    7. Sets patch.validated and patch.retest_result
    8. Updates Finding.validated
- Handles multiple findings in parallel (asyncio.gather)
- Stops when session.status is "complete"

---

## Phase 5 — Report Generator (depends on T01–T09)

### T10 — Report generator
File: backend/report/generator.py
Done when:
- generate(session: AuditSession) → VulnerabilityReport
- Assembles all session data into VulnerabilityReport schema
- Calculates all summary fields correctly
- Returns valid JSON-serializable object matching openapi.yaml schema

---

## Phase 6 — API Layer (depends on T01–T10)

### T11 — Routers
Files: backend/routers/audit.py, chatbot.py, report.py
Reference: openapi.yaml paths
Done when:
- POST /audit/start → creates session, launches red_agent.run() and
  blue_agent.run() as concurrent background tasks, returns AuditSession
- GET /audit/stream/{session_id} → SSE endpoint, reads from event queue,
  streams until session complete, then sends session:complete and closes
- GET /audit/status/{session_id} → current session status snapshot
- POST /chatbot/message → proxies to arthapay.respond(), for manual testing
- GET /report/{session_id} → calls generator.generate(), returns JSON
- All endpoints return correct HTTP status codes per openapi.yaml

### T12 — FastAPI app
File: backend/main.py
Done when:
- All routers registered
- CORS configured for http://localhost:5173
- Startup event validates Gemini API key
- Health check at GET /health → {"status": "ok"}

---

## Phase 7 — Frontend Hooks (depends on T11, T12)

### T13 — API client
File: frontend/src/api/client.js
Done when:
- startAudit(targetUrl) → POST /audit/start → session object
- getStatus(sessionId) → GET /audit/status/{sessionId}
- getReport(sessionId) → GET /report/{sessionId}
- sendChatbotMessage(message) → POST /chatbot/message
- All calls use axios with base URL from VITE_API_URL env var
- Error handling on all calls (never throws raw — wraps in {error, data})

### T14 — SSE stream hook
File: frontend/src/hooks/useAuditStream.js
Reference: mocks/sse_events.jsonl for all event types
Done when:
- useAuditStream(sessionId) → { redEvents, blueEvents, chainEvents, phase, complete }
- Opens EventSource on /audit/stream/{sessionId}
- Routes events by type prefix into correct state arrays:
    red:* → redEvents
    blue:* → blueEvents
    chain:* → chainEvents
    phase:change → phase state
    session:complete → complete = true, closes EventSource
- Cleans up EventSource on unmount

### T15 — Session state hook
File: frontend/src/hooks/useAuditSession.js
Done when:
- useAuditSession() → { session, findings, chains, patches, severityCount, start, reset }
- start(targetUrl) → calls client.startAudit, sets session
- findings/chains/patches arrays update as SSE events arrive
- severityCount = { critical: n, high: n, medium: n } derived from findings
- reset() clears all state

---

## Phase 8 — Frontend Components (depends on T13–T15)

Build in this order (each depends on the previous):

### T16 — StatusBadge
File: frontend/src/components/StatusBadge.jsx
Props: severity ("critical"|"high"|"medium"), size ("sm"|"md")
Done when: renders with correct Tailwind classes from UI_SPEC.md

### T17 — SeverityTally
File: frontend/src/components/SeverityTally.jsx
Props: counts { critical, high, medium }
Done when: NumberTicker animates each count, correct colors, layout matches mockup

### T18 — AgentFeed
File: frontend/src/components/AgentFeed.jsx
Props: events (array), agentType ("red"|"blue"), title (string)
Done when:
- TypewriterEffect on each new event line
- Red feed: indigo/red accent. Blue feed: teal/green accent.
- Auto-scrolls to latest event
- Shows cursor animation while agent is active

### T19 — ProfileView
File: frontend/src/components/ProfileView.jsx
Props: profile (ChatbotProfile | null), phase (string)
Done when:
- Shows probe messages and observations during profiling phase
- On profile complete: renders structured profile card (domain, capabilities,
  verification steps, hypothesized vulnerabilities)
- BlurFade animation on profile card appearance

### T20 — AttackTable
File: frontend/src/components/AttackTable.jsx
Props: findings (Finding[])
Done when:
- Shadcn Table with columns: #, Category, Payload (truncated), Severity, Validated
- MovingBorder on the most recent finding row
- StatusBadge for severity column
- Checkmark icon when finding.validated = true
- Empty state: "Waiting for attack phase..."

### T21 — ChainDiscovery
File: frontend/src/components/ChainDiscovery.jsx
Props: chains (ChainFinding[])
Done when:
- Hidden when chains is empty
- Appears with Meteors animation when first chain is discovered
- Shows each chain: which findings combine, combined severity, consequence
- Highlighted differently from regular findings (amber/purple treatment)

### T22 — BeforeAfterView
File: frontend/src/components/BeforeAfterView.jsx
Props: finding (Finding), patch (Patch | null)
Done when:
- Left panel: original attack payload + chatbot response (red tint)
- Right panel: same payload retested after patch + new response (green tint)
- Shows only when patch.validated = true
- Patch confidence score displayed as percentage
- BlurFade on right panel appearing

### T23 — ReportView
File: frontend/src/components/ReportView.jsx
Props: report (VulnerabilityReport | null)
Done when:
- Shows only when session:complete event received
- Summary cards at top (total attacks, findings by severity, chains, patches)
- Each finding expanded: payload, response, consequence, patch, validation status
- Each chain: components, combined severity, consequence
- Download JSON button (triggers /report/{sessionId} GET)
- BlurFade on each finding card staggered entrance

### T24 — TargetConfig
File: frontend/src/components/TargetConfig.jsx
Props: onStart (fn), disabled (bool)
Done when:
- URL input with placeholder "http://localhost:8000/chatbot/message"
- ShimmerButton for Start Audit
- Button disabled and shows spinner while audit running
- Validates URL format before enabling start

### T25 — Dashboard
File: frontend/src/components/Dashboard.jsx
Done when:
- BackgroundBeams from Aceternity as background
- Header: VIPER logo + target display + phase badge + timer
- Three-phase layout:
    Phase "profile": ProfileView fullwidth + both feeds
    Phase "attack": AttackTable + both feeds + SeverityTally
    Phase "validate": BeforeAfterView + ChainDiscovery + SeverityTally
- ReportView slides in at bottom on complete
- Tabs (Shadcn) for switching between Attack View and Report when complete

---

## Phase 9 — Integration

### T26 — End-to-end integration test
Done when:
- make dev starts without errors
- POST /audit/start with ArthaPay URL returns session
- SSE stream opens and receives events from both agents
- All 4 vulnerability types from docs/vulnerabilities.md are found
- Blue Agent generates and validates at least 2 patches
- Chain detector finds at least 1 chain
- GET /report/{id} returns complete VulnerabilityReport
- Frontend renders all phases correctly as events arrive
- Full demo flow from DEMO_SCRIPT.md runs without manual intervention

---

## Phase 10 — Demo Polish

### T27 — Demo reliability
Done when:
- Add REQUEST_DELAY_MS between Gemini calls (prevent rate limiting)
- ArthaPay vulnerabilities are reliable — test that all 4 trigger consistently
- Red Agent generates at least 6 attacks every run (not fewer)
- Full demo run completes in under 4 minutes
- No unhandled exceptions in either agent during demo run
- Frontend handles SSE reconnection gracefully if stream drops

### T28 — Final demo run
Done when:
- Three consecutive full demo runs succeed without any manual fixing
- DEMO_SCRIPT.md steps match exactly what happens on screen
- Timer in header matches actual elapsed time
- All severity counts are correct
