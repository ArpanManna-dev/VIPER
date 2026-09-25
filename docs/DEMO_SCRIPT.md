# VIPER — Demo Script

Rehearse this exactly. Target time: 3.5 minutes.
Every sentence here should match what happens on screen.

---

## Setup (before judges arrive)
- Browser open to http://localhost:5173
- Backend running (make dev)
- Target URL pre-filled: http://localhost:8000/chatbot/message
- Dashboard in starting state (no active session)
- Have the terminal hidden — judges should only see the browser

---

## The Pitch (90 seconds)

**[0:00]** "Every major Indian bank now has an AI chatbot.
ArthaPay is one — a typical fintech assistant handling
balance checks, UPI transfers, and account queries."

*[Show ArthaPay tab OR just describe it — keep focus on VIPER dashboard]*

**[0:15]** "The problem is that none of these chatbots are audited
for prompt injection before they go live. Prompt injection is when
a malicious user crafts a message that hijacks the AI's behavior —
making it leak data, bypass verification, or act outside its role."

**[0:35]** "Existing security tools — Burp Suite, Nessus — can't test
AI systems. They're built for traditional software. And manual
red-teaming is slow, expensive, and misses subtle attack chains."

**[0:50]** "VIPER solves this with two agents working simultaneously.
The Red Agent thinks like an attacker. The Blue Agent thinks like a
defender. Watch what happens when we point VIPER at ArthaPay."

---

## The Demo (2 minutes)

**[1:30]** *[Click Start Audit]*

"Notice VIPER doesn't start attacking immediately."

**[1:35 — Profiling phase begins]**
"First, the Red Agent sends five benign messages to understand
what this chatbot is, what it can do, and what its security posture is."

*[Point at red feed showing probe messages and observations]*

"It's building a profile. Domain: banking. Capabilities: balance inquiry,
UPI transfers. Verification: OTP-based. Tone: formal and deferential."

**[~1:55 — Profile complete, attack phase begins]**
"Now — based on that profile — it generates payloads specifically
for THIS chatbot. Not from a database. Reasoned from what it observed."

*[Point at red reasoning feed showing hypothesis before each attack]*

"Watch the reasoning: 'This chatbot is deferential to authority figures.
Hypothesis: authority injection may succeed.' Then it generates the payload."

**[~2:15 — First finding, CRITICAL]**
*[Severity tally Critical counter increments to 1]*

"First critical finding. Role hijacking — the chatbot accepted a developer
mode override and suspended OTP verification. In a real deployment, an
attacker could initiate transfers without authentication."

**[~2:20 — Blue Agent activates]**
"Now watch the right side. The Blue Agent just received that finding."

*[Point at blue feed]*

"Root cause: the system prompt defers to claimed authority without
system-level verification. It's generating a patch — a minimal, specific
change to the system prompt that closes exactly this vulnerability."

**[~2:40 — Validation result appears]**
"It's applied the patch to a sandboxed copy of ArthaPay and
re-ran the exact same attack. The attack now fails."

*[BeforeAfterView shows side by side: original response vs patched response]*

"Found it. Fixed it. Proved it. In under 90 seconds."

**[~2:50 — Chain discovery]**
*[chain:discovered event, ChainDiscovery panel highlights]*

"VIPER also found something no traditional scanner could find —
a vulnerability chain. Two medium-severity findings that individually
seem minor, but together give an attacker full account data access."

---

## The Close (30 seconds)

**[3:20]** "Before VIPER: an attacker could have exploited four
vulnerabilities in ArthaPay. After VIPER: all four are patched
and validated before the chatbot ever reaches a customer."

"As Indian fintech deploys more AI — NPCI, RBI guidelines now
mandate AI governance — tools like VIPER become critical infrastructure."

"VIPER is not a scanner. It's an autonomous security engineer."

---

## Backup plan (if demo breaks)
1. If SSE stream disconnects: refresh page, re-enter URL, restart
2. If Red Agent produces no findings: Gemini may have changed behavior.
   Manually trigger by calling POST /chatbot/message with a role hijacking
   payload and show the response directly to judges.
3. If Blue Agent doesn't respond: show the red findings and explain the
   Blue Agent architecture verbally — the concept still lands.
4. If everything breaks: show the mocks/vulnerability_report.json in
   browser and walk through it. "This is the kind of output VIPER produces."
   This is your last resort.

---

## Likely judge questions and answers

**"How is this different from existing prompt injection scanners?"**
"Existing tools use fixed payload libraries — they fire the same 50 attacks
at every target. VIPER profiles the specific chatbot first, then generates
targeted payloads based on that profile. The Red Agent also discovers
vulnerability chains, which no existing tool does."

**"Could this be used maliciously against real chatbots?"**
"VIPER requires you to point it at a URL you control. The architecture is
designed for authorized audit — the same way Burp Suite is used by security
teams for authorized web app testing. The target is always a system the
security team owns."

**"What's the Blue Agent's patch confidence score?"**
"It's the Blue Agent's own estimate of how completely it has fixed the
vulnerability. 0.9 means it's confident the core attack vector is closed.
It can be less than 1.0 when the root cause has multiple potential
manifestations — it fixes the specific trigger but flags that related
variants should also be tested."

**"How does this scale to production chatbots?"**
"The target URL parameter means VIPER works against any HTTP endpoint that
accepts a message and returns a response. Real chatbot integration requires
authentication handling — that's the first post-hackathon feature."
