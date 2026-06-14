"""Edge TTS 语音合成路由"""

import asyncio
import io
import tempfile
import os
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse, FileResponse

router = APIRouter(prefix="/api/tts", tags=["tts"])

# 语言代码到 Edge TTS voice 名称的映射
EDGE_TTS_VOICES = {
    "en": "en-US-AriaNeural",
    "fr": "fr-FR-DeniseNeural",
    "pt": "pt-BR-FranciscaNeural",
    "de": "de-DE-KatjaNeural",
    "ro": "ro-RO-AlinaNeural",
    "sv": "sv-SE-SofieNeural",
    "da": "da-DK-ChristelNeural",
    "bg": "bg-BG-KalinaNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "cs": "cs-CZ-VlastaNeural",
    "el": "el-GR-AthinaNeural",
    "uk": "uk-UA-PolinaNeural",
    "es": "es-ES-ElviraNeural",
    "nl": "nl-NL-FennaNeural",
    "sk": "sk-SK-ViktoriaNeural",
    "hr": "hr-HR-GabrijelaNeural",
    "pl": "pl-PL-ZofiaNeural",
    "lt": "lt-LT-OnaNeural",
    "nb": "nb-NO-IselinNeural",
    "nn": "nb-NO-IselinNeural",
    "fa": "fa-IR-DilaraNeural",
    "sl": "sl-SI-PetraNeural",
    "gu": "gu-IN-DhwaniNeural",
    "lv": "lv-LT-EveritaNeural",
    "it": "it-IT-ElsaNeural",
    "ne": "ne-NP-SagarNeural",
    "mr": "mr-IN-AarohiNeural",
    "be": "be-BY-AlenaNeural",
    "sr": "sr-RS-SophieNeural",
    "hi": "hi-IN-SwaraNeural",
    "pa": "pa-IN-OjasNeural",
    "bn": "bn-IN-TanishaaNeural",
    "or": "or-IN-OjasveeNeural",
    "tg": "tg-TJ-NigorNeural",
    "yi": "yi-US-YanklNeural",
    "gl": "gl-ES-SabelaNeural",
    "ca": "ca-ES-JoanaNeural",
    "is": "is-IS-GudrunNeural",
    "sq": "sq-AL-AnilaNeural",
    "af": "af-ZA-AdriNeural",
    "mk": "mk-MK-MarijaNeural",
    "si": "si-LK-ThiliniNeural",
    "ur": "ur-PK-UzmaNeural",
    "bs": "bs-BA-GoranNeural",
    "hy": "hy-AM-AnahitNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "zh-TW": "zh-TW-HsiaoChenNeural",
    "yue": "zh-HK-HiuGaaiNeural",
    "my": "my-MM-NilarNeural",
    "ar": "ar-SA-ZariyahNeural",
    "ars": "ar-SA-ZariyahNeural",
    "apc": "ar-SY-AmanyNeural",
    "arz": "ar-EG-SalmaNeural",
    "ary": "ar-MA-MounaNeural",
    "acm": "ar-IQ-RanaNeural",
    "acq": "ar-YE-MaryamNeural",
    "aeb": "ar-TN-HalimaNeural",
    "he": "he-IL-HilaNeural",
    "mt": "mt-MT-GraceNeural",
    "id": "id-ID-GadisNeural",
    "ms": "ms-MY-YasminNeural",
    "tl": "tl-PH-TangingNeural",
    "ceb": "fil-PH-AngeloNeural",
    "jv": "jv-ID-SitiNeural",
    "su": "su-ID-TutiNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "tr": "tr-TR-EmelNeural",
    "az": "az-AZ-BanuNeural",
    "uz": "uz-UZ-MadinaNeural",
    "kk": "kk-KZ-AigulNeural",
    "ba": "ba-RU-DilraboNeural",
    "tt": "tt-RU-DariyaNeural",
    "th": "th-TH-PremwadeeNeural",
    "lo": "lo-LA-KeomanyNeural",
    "fi": "fi-FI-NooraNeural",
    "et": "et-EE-AnuNeural",
    "hu": "hu-HU-NoemiNeural",
    "vi": "vi-VN-HoaiMyNeural",
    "km": "km-KH-SreymomNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-SunHiNeural",
    "ka": "ka-GE-EkaNeural",
    "eu": "eu-ES-AinhoaNeural",
    "ht": "ht-HT-VevelineNeural",
    "sw": "sw-KE-ZuriNeural",
}


def _get_voice(lang: str) -> str:
    """根据语言代码获取 Edge TTS voice 名称"""
    if lang in EDGE_TTS_VOICES:
        return EDGE_TTS_VOICES[lang]
    # 尝试语言前缀匹配
    prefix = lang.split("-")[0].lower()
    if prefix in EDGE_TTS_VOICES:
        return EDGE_TTS_VOICES[prefix]
    # 默认英语
    return "en-US-AriaNeural"


@router.get("/speak")
async def speak(
    text: str = Query(..., description="要朗读的文本"),
    lang: str = Query("en", description="语言代码"),
    slow: bool = Query(False, description="慢速朗读"),
):
    """使用 Edge TTS 生成语音并流式返回音频"""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        import edge_tts

        voice = _get_voice(lang)
        rate = "-30%" if slow else "+0%"

        communicate = edge_tts.Communicate(text, voice, rate=rate)

        async def audio_stream():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]

        return StreamingResponse(
            audio_stream(),
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "no-cache",
                "Content-Disposition": "inline; filename=tts.mp3",
            },
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="edge-tts not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
