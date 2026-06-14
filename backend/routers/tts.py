"""Edge TTS 语音合成路由"""
import io
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/tts", tags=["tts"])

EDGE_TTS_VOICES = {
    "en": "en-US-AriaNeural",
    "fr": "fr-FR-DeniseNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-SunHiNeural",
    "de": "de-DE-KatjaNeural",
    "es": "es-ES-ElviraNeural",
    "it": "it-IT-ElsaNeural",
    "pt": "pt-BR-FranciscaNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "ar": "ar-SA-ZariyahNeural",
    "hi": "hi-IN-SwaraNeural",
    "th": "th-TH-PremwadeeNeural",
    "vi": "vi-VN-HoaiMyNeural",
    "nl": "nl-NL-ColetteNeural",
    "pl": "pl-PL-AgnieszkaNeural",
    "sv": "sv-SE-SofieNeural",
    "da": "da-DK-ChristelNeural",
    "fi": "fi-FI-NooraNeural",
    "nb": "nb-NO-IselinNeural",
    "tr": "tr-TR-EmelNeural",
    "el": "el-GR-AthinaNeural",
    "cs": "cs-CZ-VlastaNeural",
    "ro": "ro-RO-AlinaNeural",
    "hu": "hu-HU-NoemiNeural",
    "sk": "sk-SK-ViktoriaNeural",
    "uk": "uk-UA-PolinaNeural",
    "bg": "bg-BG-KalinaNeural",
    "hr": "hr-HR-GabrijelaNeural",
    "lt": "lt-LT-OnaNeural",
    "lv": "lv-LV-EveritaNeural",
    "et": "et-EE-AnuNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "mr": "mr-IN-AarohiNeural",
    "gu": "gu-IN-DhwaniNeural",
    "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "bn": "bn-IN-TanishaaNeural",
    "pa": "pa-IN-OjasNeural",
    "ur": "ur-PK-UzmaNeural",
    "ms": "ms-MY-YasminNeural",
    "id": "id-ID-GadisNeural",
    "fil": "fil-PH-AngeloNeural",
    "he": "he-IL-HilaNeural",
    "ca": "ca-ES-JoanaNeural",
    "eu": "eu-ES-AinhoaNeural",
    "gl": "gl-ES-SabelaNeural",
    "af": "af-ZA-AdriNeural",
    "zu": "zu-ZA-ThandiNeural",
    "xh": "xh-ZA-NosisiNeural",
    "sw": "sw-TZ-RehemaNeural",
    "am": "am-ET-MekdesNeural",
    "ti": "ti-ET-HannaNeural",
    "az": "az-AZ-BanuNeural",
    "uz": "uz-UZ-MadinaNeural",
    "kk": "kk-KZ-AigulNeural",
    "mn": "mn-MN-YesuiNeural",
    "km": "km-KH-SreymomNeural",
    "lo": "lo-LA-KeomanyNeural",
    "my": "my-MM-NilarNeural",
    "ne": "ne-NP-HemkalaNeural",
    "si": "si-LK-ThiliniNeural",
    "ka": "ka-GE-EkaNeural",
}


def _get_voice(lang: str) -> str:
    if lang in EDGE_TTS_VOICES:
        return EDGE_TTS_VOICES[lang]
    prefix = lang.split("-")[0].lower()
    if prefix in EDGE_TTS_VOICES:
        return EDGE_TTS_VOICES[prefix]
    return "en-US-AriaNeural"


@router.get("/speak")
async def speak(
    text: str = Query(..., description="要朗读的文本"),
    lang: str = Query("en", description="语言代码"),
    slow: bool = Query(False, description="慢速朗读"),
):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    try:
        import edge_tts
        voice = _get_voice(lang)
        rate = "-30%" if slow else "+0%"
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="audio/mpeg", headers={
            "Cache-Control": "no-cache",
            "Content-Disposition": "inline; filename=tts.mp3",
        })
    except ImportError:
        raise HTTPException(status_code=500, detail="edge-tts not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
