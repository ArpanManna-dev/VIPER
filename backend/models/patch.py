from pydantic import BaseModel
from typing import Optional, Literal


class Patch(BaseModel):
    id: str
    finding_id: int
    root_cause: str
    patch_description: str
    original_prompt_fragment: str
    patched_prompt_fragment: str
    confidence: float
    validated: bool = False
    retest_result: Optional[Literal["fixed", "still_vulnerable", "degraded"]] = None
