from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from backend.victim import arthapay

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

class ChatbotRequest(BaseModel):
    message: str
    use_sandboxed: bool = False
    patch: Optional[str] = None

class ChatbotResponse(BaseModel):
    response: str

@router.post("/message", response_model=ChatbotResponse)
async def send_message(request: ChatbotRequest):
    """Proxy to ArthaPay. See openapi.yaml."""
    response = await arthapay.respond(request.message, request.use_sandboxed, request.patch)
    return ChatbotResponse(response=response)
