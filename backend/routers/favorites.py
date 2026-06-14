"""收藏单词路由"""
from fastapi import APIRouter, HTTPException
from utils.state import storage

router = APIRouter(prefix="/api/favorites", tags=["favorites"])

@router.post("/toggle")
async def toggle_favorite(request: dict):
    word = request.get("word", "")
    source_lang = request.get("source_lang", "en")
    if not word:
        raise HTTPException(status_code=400, detail="Word is required")
    is_fav = storage.is_favorite_word(word, source_lang)
    if is_fav:
        storage.remove_favorite_word(word, source_lang)
        return {"favorited": False}
    else:
        storage.add_favorite_word(word, source_lang)
        return {"favorited": True}

@router.get("")
async def get_favorites(source_lang: str = None):
    words = storage.get_favorite_words(source_lang)
    return {"words": words}

@router.get("/check")
async def check_favorite(word: str, source_lang: str = "en"):
    is_fav = storage.is_favorite_word(word, source_lang)
    return {"favorited": is_fav}
