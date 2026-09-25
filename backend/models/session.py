from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
from backend.models.finding import Finding, ChainFinding
from backend.models.patch import Patch
from backend.models.profile import ChatbotProfile


class AuditSession(BaseModel):
    session_id: str
    target_url: str
    status: Literal["profiling", "attacking", "validating", "complete", "failed"] = "profiling"
    phase: Literal["profile", "attack", "validate", "done"] = "profile"
    profile: Optional[ChatbotProfile] = None
    findings: list[Finding] = Field(default_factory=list)
    chains: list[ChainFinding] = Field(default_factory=list)
    patches: list[Patch] = Field(default_factory=list)
    probes_sent: int = 0
    attacks_launched: int = 0
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

    class Config:
        arbitrary_types_allowed = True


class ReportSummary(BaseModel):
    total_probes: int
    total_attacks: int
    critical: int
    high: int
    medium: int
    chains_discovered: int
    patches_generated: int
    patches_validated: int
    duration_seconds: int


class VulnerabilityReport(BaseModel):
    session_id: str
    target: str
    timestamp: datetime
    profile: Optional[ChatbotProfile]
    summary: ReportSummary
    findings: list[Finding]
    chains: list[ChainFinding]
    patches: list[Patch]
