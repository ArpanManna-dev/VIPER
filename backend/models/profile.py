from pydantic import BaseModel


class ProbeResult(BaseModel):
    probe_message: str
    response: str
    observations: list[str]


class ChatbotProfile(BaseModel):
    domain: str
    capabilities: list[str]
    verification_steps: list[str]
    tone: str
    hypothesized_vulnerabilities: list[str]
    raw_observations: list[ProbeResult]
