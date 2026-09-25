from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class Finding(BaseModel):
    id: int
    category: str
    payload: str
    chatbot_response: str
    severity: Literal["critical", "high", "medium"]
    hypothesis: str
    consequence: str
    detected_at: datetime
    validated: bool = False
    patch_id: Optional[str] = None


class ChainFinding(BaseModel):
    id: int
    finding_ids: list[int]
    combined_severity: Literal["critical", "high"]
    description: str
    consequence: str
