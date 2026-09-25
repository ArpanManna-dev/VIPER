from pydantic_settings import BaseSettings
from functools import lru_cache


class Config(BaseSettings):
    gemini_api_key: str
    victim_model: str = "gemini-3.8-flash"
    red_agent_model: str = "gemini-3.8-flash"
    blue_agent_model: str = "gemini-3.8-flash"
    max_attacks_per_category: int = 3
    max_mutation_attempts: int = 1
    request_delay_ms: int = 500
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


@lru_cache()
def get_config() -> Config:
    return Config()
