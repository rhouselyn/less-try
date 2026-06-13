"""静态路由：root /, tts"""

from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["static"])


@router.get("/api/tts")
async def tts_endpoint(text: str, lang: str = "en", slow: bool = False):
    raise HTTPException(status_code=410, detail="TTS is now handled by Web Speech API on the frontend")


@router.get("/")
async def root():
    return {"message": "少邻国 - Gualingo API"}
