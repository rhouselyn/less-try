import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Sparkles, Search, X, ChevronDown, ChevronRight, ArrowRight, PenLine } from 'lucide-react'

const LANGUAGES = [
  { value: 'en', native: 'English', en: 'English', zh: '英语', family: 'indo-european', flag: '🇬🇧' },
  { value: 'fr', native: 'Français', en: 'French', zh: '法语', family: 'indo-european', flag: '🇫🇷' },
  { value: 'pt', native: 'Português', en: 'Portuguese', zh: '葡萄牙语', family: 'indo-european', flag: '🇵🇹' },
  { value: 'de', native: 'Deutsch', en: 'German', zh: '德语', family: 'indo-european', flag: '🇩🇪' },
  { value: 'ro', native: 'Română', en: 'Romanian', zh: '罗马尼亚语', family: 'indo-european', flag: '🇷🇴' },
  { value: 'sv', native: 'Svenska', en: 'Swedish', zh: '瑞典语', family: 'indo-european', flag: '🇸🇪' },
  { value: 'da', native: 'Dansk', en: 'Danish', zh: '丹麦语', family: 'indo-european', flag: '🇩🇰' },
  { value: 'bg', native: 'Български', en: 'Bulgarian', zh: '保加利亚语', family: 'indo-european', flag: '🇧🇬' },
  { value: 'ru', native: 'Русский', en: 'Russian', zh: '俄语', family: 'indo-european', flag: '🇷🇺' },
  { value: 'cs', native: 'Čeština', en: 'Czech', zh: '捷克语', family: 'indo-european', flag: '🇨🇿' },
  { value: 'el', native: 'Ελληνικά', en: 'Greek', zh: '希腊语', family: 'indo-european', flag: '🇬🇷' },
  { value: 'uk', native: 'Українська', en: 'Ukrainian', zh: '乌克兰语', family: 'indo-european', flag: '🇺🇦' },
  { value: 'es', native: 'Español', en: 'Spanish', zh: '西班牙语', family: 'indo-european', flag: '🇪🇸' },
  { value: 'nl', native: 'Nederlands', en: 'Dutch', zh: '荷兰语', family: 'indo-european', flag: '🇳🇱' },
  { value: 'sk', native: 'Slovenčina', en: 'Slovak', zh: '斯洛伐克语', family: 'indo-european', flag: '🇸🇰' },
  { value: 'hr', native: 'Hrvatski', en: 'Croatian', zh: '克罗地亚语', family: 'indo-european', flag: '🇭🇷' },
  { value: 'pl', native: 'Polski', en: 'Polish', zh: '波兰语', family: 'indo-european', flag: '🇵🇱' },
  { value: 'lt', native: 'Lietuvių', en: 'Lithuanian', zh: '立陶宛语', family: 'indo-european', flag: '🇱🇹' },
  { value: 'nb', native: 'Norsk Bokmål', en: 'Norwegian Bokmål', zh: '挪威布克莫尔语', family: 'indo-european', flag: '🇳🇴' },
  { value: 'nn', native: 'Norsk Nynorsk', en: 'Norwegian Nynorsk', zh: '挪威尼诺斯克语', family: 'indo-european', flag: '🇳🇴' },
  { value: 'fa', native: 'فارسی', en: 'Persian', zh: '波斯语', family: 'indo-european', flag: '🇮🇷' },
  { value: 'sl', native: 'Slovenščina', en: 'Slovenian', zh: '斯洛文尼亚语', family: 'indo-european', flag: '🇸🇮' },
  { value: 'gu', native: 'ગુજરાતી', en: 'Gujarati', zh: '古吉拉特语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'lv', native: 'Latviešu', en: 'Latvian', zh: '拉脱维亚语', family: 'indo-european', flag: '🇱🇻' },
  { value: 'it', native: 'Italiano', en: 'Italian', zh: '意大利语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'oc', native: 'Occitan', en: 'Occitan', zh: '奥克语', family: 'indo-european', flag: '🇫🇷' },
  { value: 'ne', native: 'नेपाली', en: 'Nepali', zh: '尼泊尔语', family: 'indo-european', flag: '🇳🇵' },
  { value: 'mr', native: 'मराठी', en: 'Marathi', zh: '马拉地语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'be', native: 'Беларуская', en: 'Belarusian', zh: '白俄罗斯语', family: 'indo-european', flag: '🇧🇾' },
  { value: 'sr', native: 'Српски', en: 'Serbian', zh: '塞尔维亚语', family: 'indo-european', flag: '🇷🇸' },
  { value: 'lb', native: 'Lëtzebuergesch', en: 'Luxembourgish', zh: '卢森堡语', family: 'indo-european', flag: '🇱🇺' },
  { value: 'vec', native: 'Vèneto', en: 'Venetian', zh: '威尼斯语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'as', native: 'অসমীয়া', en: 'Assamese', zh: '阿萨姆语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'cy', native: 'Cymraeg', en: 'Welsh', zh: '威尔士语', family: 'indo-european', flag: '🇬🇧' },
  { value: 'szl', native: 'Ślōnski', en: 'Silesian', zh: '西里西亚语', family: 'indo-european', flag: '🇵🇱' },
  { value: 'ast', native: 'Asturianu', en: 'Asturian', zh: '阿斯图里亚斯语', family: 'indo-european', flag: '🇪🇸' },
  { value: 'hne', native: 'छत्तीसगढ़ी', en: 'Chhattisgarhi', zh: '恰蒂斯加尔语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'awa', native: 'अवधी', en: 'Awadhi', zh: '阿瓦迪语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'mai', native: 'मैथिली', en: 'Maithili', zh: '迈蒂利语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'bho', native: 'भोजपुरी', en: 'Bhojpuri', zh: '博杰普尔语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'sd', native: 'سنڌي', en: 'Sindhi', zh: '信德语', family: 'indo-european', flag: '🇵🇰' },
  { value: 'ga', native: 'Gaeilge', en: 'Irish', zh: '爱尔兰语', family: 'indo-european', flag: '🇮🇪' },
  { value: 'fo', native: 'Føroyskt', en: 'Faroese', zh: '法罗语', family: 'indo-european', flag: '🇫🇴' },
  { value: 'hi', native: 'हिन्दी', en: 'Hindi', zh: '印地语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'pa', native: 'ਪੰਜਾਬੀ', en: 'Punjabi', zh: '旁遮普语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'bn', native: 'বাংলা', en: 'Bengali', zh: '孟加拉语', family: 'indo-european', flag: '🇧🇩' },
  { value: 'or', native: 'ଓଡ଼ିଆ', en: 'Odia', zh: '奥里亚语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'tg', native: 'Тоҷикӣ', en: 'Tajik', zh: '塔吉克语', family: 'indo-european', flag: '🇹🇯' },
  { value: 'yi', native: 'ייִדיש', en: 'Yiddish', zh: '意第绪语', family: 'indo-european', flag: '🇮🇱' },
  { value: 'lmo', native: 'Lombard', en: 'Lombard', zh: '伦巴第语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'lij', native: 'Lìgure', en: 'Ligurian', zh: '利古里亚语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'scn', native: 'Sicilianu', en: 'Sicilian', zh: '西西里语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'fur', native: 'Furlan', en: 'Friulian', zh: '弗留利语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'sc', native: 'Sardu', en: 'Sardinian', zh: '撒丁语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'gl', native: 'Galego', en: 'Galician', zh: '加利西亚语', family: 'indo-european', flag: '🇪🇸' },
  { value: 'ca', native: 'Català', en: 'Catalan', zh: '加泰罗尼亚语', family: 'indo-european', flag: '🇪🇸' },
  { value: 'is', native: 'Íslenska', en: 'Icelandic', zh: '冰岛语', family: 'indo-european', flag: '🇮🇸' },
  { value: 'sq', native: 'Shqip', en: 'Albanian', zh: '阿尔巴尼亚语', family: 'indo-european', flag: '🇦🇱' },
  { value: 'li', native: 'Limburgs', en: 'Limburgish', zh: '林堡语', family: 'indo-european', flag: '🇳🇱' },
  { value: 'prs', native: 'دری', en: 'Dari', zh: '达里语', family: 'indo-european', flag: '🇦🇫' },
  { value: 'af', native: 'Afrikaans', en: 'Afrikaans', zh: '南非荷兰语', family: 'indo-european', flag: '🇿🇦' },
  { value: 'mk', native: 'Македонски', en: 'Macedonian', zh: '马其顿语', family: 'indo-european', flag: '🇲🇰' },
  { value: 'si', native: 'සිංහල', en: 'Sinhala', zh: '僧伽罗语', family: 'indo-european', flag: '🇱🇰' },
  { value: 'ur', native: 'اردو', en: 'Urdu', zh: '乌尔都语', family: 'indo-european', flag: '🇵🇰' },
  { value: 'mag', native: 'मगही', en: 'Magahi', zh: '马加伊语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'bs', native: 'Bosanski', en: 'Bosnian', zh: '波斯尼亚语', family: 'indo-european', flag: '🇧🇦' },
  { value: 'hy', native: 'Հայերեն', en: 'Armenian', zh: '亚美尼亚语', family: 'indo-european', flag: '🇦🇲' },
  { value: 'zh', native: '简体中文', en: 'Chinese (Simplified)', zh: '简体中文', family: 'sino-tibetan', flag: '🇨🇳' },
  { value: 'zh-TW', native: '繁體中文', en: 'Chinese (Traditional)', zh: '繁体中文', family: 'sino-tibetan', flag: '🇹🇼' },
  { value: 'yue', native: '粵語', en: 'Cantonese', zh: '粤语', family: 'sino-tibetan', flag: '🇭🇰' },
  { value: 'my', native: 'မြန်မာ', en: 'Burmese', zh: '缅甸语', family: 'sino-tibetan', flag: '🇲🇲' },
  { value: 'ar', native: 'العربية', en: 'Arabic (Standard)', zh: '标准阿拉伯语', family: 'afro-asiatic', flag: '🇸🇦' },
  { value: 'ars', native: 'نجدي', en: 'Arabic (Najdi)', zh: '内志阿拉伯语', family: 'afro-asiatic', flag: '🇸🇦' },
  { value: 'apc', native: 'شامي', en: 'Arabic (Levantine)', zh: '黎凡特阿拉伯语', family: 'afro-asiatic', flag: '🇱🇧' },
  { value: 'arz', native: 'مصري', en: 'Arabic (Egyptian)', zh: '埃及阿拉伯语', family: 'afro-asiatic', flag: '🇪🇬' },
  { value: 'ary', native: 'الدارجة', en: 'Arabic (Moroccan)', zh: '摩洛哥阿拉伯语', family: 'afro-asiatic', flag: '🇲🇦' },
  { value: 'acm', native: 'العراقية', en: 'Arabic (Mesopotamian)', zh: '美索不达米亚阿拉伯语', family: 'afro-asiatic', flag: '🇮🇶' },
  { value: 'acq', native: 'يمني', en: 'Arabic (Ta\'izzi-Adeni)', zh: '塔伊兹-亚丁阿拉伯语', family: 'afro-asiatic', flag: '🇾🇪' },
  { value: 'aeb', native: 'تونسي', en: 'Arabic (Tunisian)', zh: '突尼斯阿拉伯语', family: 'afro-asiatic', flag: '🇹🇳' },
  { value: 'he', native: 'עברית', en: 'Hebrew', zh: '希伯来语', family: 'afro-asiatic', flag: '🇮🇱' },
  { value: 'mt', native: 'Malti', en: 'Maltese', zh: '马耳他语', family: 'afro-asiatic', flag: '🇲🇹' },
  { value: 'id', native: 'Bahasa Indonesia', en: 'Indonesian', zh: '印尼语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'ms', native: 'Bahasa Melayu', en: 'Malay', zh: '马来语', family: 'austronesian', flag: '🇲🇾' },
  { value: 'tl', native: 'Tagalog', en: 'Tagalog', zh: '他加禄语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'ceb', native: 'Cebuano', en: 'Cebuano', zh: '宿务语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'jv', native: 'Basa Jawa', en: 'Javanese', zh: '爪哇语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'su', native: 'Basa Sunda', en: 'Sundanese', zh: '巽他语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'min', native: 'Baso Minangkabau', en: 'Minangkabau', zh: '米南加保语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'ban', native: 'Basa Bali', en: 'Balinese', zh: '巴厘语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'bjn', native: 'Bahasa Banjar', en: 'Banjar', zh: '班加尔语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'pag', native: 'Pangasinan', en: 'Pangasinan', zh: '邦阿西楠语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'ilo', native: 'Ilokano', en: 'Ilokano', zh: '伊洛卡诺语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'war', native: 'Waray', en: 'Waray', zh: '瓦瑞语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'ta', native: 'தமிழ்', en: 'Tamil', zh: '泰米尔语', family: 'dravidian', flag: '🇮🇳' },
  { value: 'te', native: 'తెలుగు', en: 'Telugu', zh: '泰卢固语', family: 'dravidian', flag: '🇮🇳' },
  { value: 'kn', native: 'ಕನ್ನಡ', en: 'Kannada', zh: '卡纳达语', family: 'dravidian', flag: '🇮🇳' },
  { value: 'ml', native: 'മലയാളം', en: 'Malayalam', zh: '马拉雅拉姆语', family: 'dravidian', flag: '🇮🇳' },
  { value: 'tr', native: 'Türkçe', en: 'Turkish', zh: '土耳其语', family: 'turkic', flag: '🇹🇷' },
  { value: 'az', native: 'Azərbaycan', en: 'Azerbaijani', zh: '阿塞拜疆语', family: 'turkic', flag: '🇦🇿' },
  { value: 'uz', native: 'Oʻzbek', en: 'Uzbek', zh: '乌兹别克语', family: 'turkic', flag: '🇺🇿' },
  { value: 'kk', native: 'Қазақ', en: 'Kazakh', zh: '哈萨克语', family: 'turkic', flag: '🇰🇿' },
  { value: 'ba', native: 'Башҡорт', en: 'Bashkir', zh: '巴什基尔语', family: 'turkic', flag: '🇷🇺' },
  { value: 'tt', native: 'Татар', en: 'Tatar', zh: '鞑靼语', family: 'turkic', flag: '🇷🇺' },
  { value: 'th', native: 'ไทย', en: 'Thai', zh: '泰语', family: 'tai-kadai', flag: '🇹🇭' },
  { value: 'lo', native: 'ລາວ', en: 'Lao', zh: '老挝语', family: 'tai-kadai', flag: '🇱🇦' },
  { value: 'fi', native: 'Suomi', en: 'Finnish', zh: '芬兰语', family: 'uralic', flag: '🇫🇮' },
  { value: 'et', native: 'Eesti', en: 'Estonian', zh: '爱沙尼亚语', family: 'uralic', flag: '🇪🇪' },
  { value: 'hu', native: 'Magyar', en: 'Hungarian', zh: '匈牙利语', family: 'uralic', flag: '🇭🇺' },
  { value: 'vi', native: 'Tiếng Việt', en: 'Vietnamese', zh: '越南语', family: 'austroasiatic', flag: '🇻🇳' },
  { value: 'km', native: 'ភាសាខ្មែរ', en: 'Khmer', zh: '高棉语', family: 'austroasiatic', flag: '🇰🇭' },
  { value: 'ja', native: '日本語', en: 'Japanese', zh: '日语', family: 'other', flag: '🇯🇵' },
  { value: 'ko', native: '한국어', en: 'Korean', zh: '韩语', family: 'other', flag: '🇰🇷' },
  { value: 'ka', native: 'ქართული', en: 'Georgian', zh: '格鲁吉亚语', family: 'other', flag: '🇬🇪' },
  { value: 'eu', native: 'Euskara', en: 'Basque', zh: '巴斯克语', family: 'other', flag: '🇪🇸' },
  { value: 'ht', native: 'Kreyòl Ayisyen', en: 'Haitian Creole', zh: '海地语', family: 'other', flag: '🇭🇹' },
  { value: 'pap', native: 'Papiamentu', en: 'Papiamento', zh: '帕皮阿门托语', family: 'other', flag: '🇦🇼' },
  { value: 'kea', native: 'Kabuverdianu', en: 'Kabuverdianu', zh: '佛得角语', family: 'other', flag: '🇨🇻' },
  { value: 'tpi', native: 'Tok Pisin', en: 'Tok Pisin', zh: '托克皮辛语', family: 'other', flag: '🇵🇬' },
  { value: 'sw', native: 'Kiswahili', en: 'Swahili', zh: '斯瓦希里语', family: 'other', flag: '🇰🇪' },
]

const FAMILIES = {
  'indo-european': 'Indo-European',
  'sino-tibetan': 'Sino-Tibetan',
  'afro-asiatic': 'Afro-Asiatic',
  'austronesian': 'Austronesian',
  'dravidian': 'Dravidian',
  'turkic': 'Turkic',
  'tai-kadai': 'Tai-Kadai',
  'uralic': 'Uralic',
  'austroasiatic': 'Austroasiatic',
  'other': 'Other',
}

const FAMILY_ORDER = [
  'sino-tibetan',
  'indo-european',
  'afro-asiatic',
  'austronesian',
  'dravidian',
  'turkic',
  'tai-kadai',
  'uralic',
  'austroasiatic',
  'other',
]

const POPULAR_LANGUAGES = ['en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'it', 'pt', 'th', 'vi', 'ar']

function LanguageSelector({ value, onChange, targetLang }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    const handleEscape = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const selectedLang = LANGUAGES.find((l) => l.value === value)

  const getLabel = (lang) => targetLang === 'zh' ? lang.zh : lang.en

  const getSecondary = (lang) => {
    const primary = getLabel(lang)
    return lang.native !== primary ? lang.native : null
  }

  const filteredLanguages = LANGUAGES.filter((l) => {
    if (!search) return true
    const s = search.toLowerCase()
    return l.native.toLowerCase().includes(s) || l.en.toLowerCase().includes(s) || l.zh.includes(search) || l.value.toLowerCase().includes(s)
  })

  const groupedLanguages = FAMILY_ORDER.reduce((acc, family) => {
    const langs = filteredLanguages.filter((l) => l.family === family)
    if (langs.length > 0) acc[family] = langs
    return acc
  }, {})

  const toggleFamily = (family) => setCollapsed((prev) => ({ ...prev, [family]: !prev[family] }))

  const handleSelect = (langValue) => {
    onChange(langValue)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-stone-200/80 shadow-xl shadow-stone-900/8 overflow-hidden"
          >
            <div className="p-3 border-b border-stone-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={targetLang === 'zh' ? '搜索语言...' : 'Search languages...'}
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-stone-50 border border-stone-100 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-amber-300 focus:bg-white transition-colors"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-stone-200 transition-colors">
                    <X className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto overscroll-contain">
              {Object.keys(groupedLanguages).length === 0 && (
                <div className="py-8 text-center text-sm text-stone-400">
                  {targetLang === 'zh' ? '未找到语言' : 'No languages found'}
                </div>
              )}
              {FAMILY_ORDER.map((family) => {
                const langs = groupedLanguages[family]
                if (!langs) return null
                const isCollapsed = !search && collapsed[family]
                return (
                  <div key={family}>
                    <button
                      type="button"
                      onClick={() => toggleFamily(family)}
                      className="w-full flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-stone-500 uppercase tracking-wider hover:bg-stone-50 transition-colors"
                    >
                      {isCollapsed ? <ChevronRight className="w-3 h-3 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 flex-shrink-0" />}
                      <span>{FAMILIES[family]}</span>
                      <span className="text-stone-300 font-normal normal-case tracking-normal">{langs.length}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          {langs.map((lang) => (
                            <button
                              key={lang.value}
                              type="button"
                              onClick={() => handleSelect(lang.value)}
                              className={`w-full flex items-center gap-2.5 px-5 py-1.5 text-sm transition-colors ${
                                value === lang.value ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              <span className="text-base leading-none flex-shrink-0">{lang.flag}</span>
                              <span className={value === lang.value ? 'font-medium' : ''}>{getLabel(lang)}</span>
                              {getSecondary(lang) && <span className="text-xs text-stone-400">{getSecondary(lang)}</span>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InputStep({ text, setText, sourceLang, setSourceLang, loading, onProcess, t }) {
  const [showMoreLangs, setShowMoreLangs] = useState(false)
  const selectedLang = LANGUAGES.find((l) => l.value === sourceLang)
  const popularLangs = POPULAR_LANGUAGES.map((code) => LANGUAGES.find((l) => l.value === code)).filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="max-w-lg mx-auto"
    >
      <div className="relative">
        <div className="absolute -inset-3 bg-gradient-to-b from-amber-100/20 via-amber-50/10 to-transparent rounded-3xl pointer-events-none" />

        <div className="relative space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/80 border border-amber-200/40 mb-3">
              <span className="text-4xl leading-none">{selectedLang?.flag || '🌍'}</span>
            </div>
            <h2 className="text-2xl font-bold text-stone-800 tracking-tight">
              {selectedLang?.native || sourceLang}
            </h2>
            <p className="text-sm text-stone-400 mt-0.5">
              {selectedLang ? (sourceLang === 'zh' ? selectedLang.zh : selectedLang.en) : sourceLang}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <label className="block text-[11px] font-medium text-stone-500 mb-2 uppercase tracking-wider">
              {t.learnLang}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {popularLangs.map((lang) => (
                <motion.button
                  key={lang.value}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSourceLang(lang.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all duration-200 ${
                    sourceLang === lang.value
                      ? 'border-amber-400/80 bg-amber-50 shadow-[0_0_0_3px_rgba(245,158,11,0.06)]'
                      : 'border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-sm'
                  }`}
                >
                  <span className="text-xl leading-none">{lang.flag}</span>
                  <span className={`text-[11px] leading-tight ${
                    sourceLang === lang.value ? 'font-semibold text-amber-700' : 'font-medium text-stone-600'
                  }`}>
                    {lang.native.length > 8 ? (sourceLang === 'zh' ? lang.zh : lang.en) : lang.native}
                  </span>
                </motion.button>
              ))}
            </div>

            <div className="mt-2 relative">
              <button
                type="button"
                onClick={() => setShowMoreLangs(!showMoreLangs)}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 ${
                  showMoreLangs
                    ? 'border-amber-400/80 bg-amber-50 text-amber-700'
                    : 'border-stone-200/80 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-600'
                }`}
              >
                <span>{showMoreLangs ? '收起' : '更多语言'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showMoreLangs ? 'rotate-180' : ''}`} />
              </button>
              {showMoreLangs && (
                <LanguageSelector value={sourceLang} onChange={(v) => { setSourceLang(v); setShowMoreLangs(false) }} targetLang={sourceLang === 'zh' ? 'zh' : 'en'} />
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <label className="block text-[11px] font-medium text-stone-500 mb-1.5 uppercase tracking-wider">
              {t.inputText}
            </label>
            <div className="relative group">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.placeholder}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-stone-200/80 bg-white text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-400/80 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.06)] resize-none leading-relaxed transition-all duration-200 hover:border-stone-300"
              />
              <div className="absolute top-3 right-3 pointer-events-none">
                <PenLine className="w-4 h-4 text-stone-200 group-focus-within:text-amber-300 transition-colors" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onProcess}
              disabled={loading || !text.trim()}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                loading || !text.trim()
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/25'
              }`}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.processing}
                  </motion.span>
                ) : (
                  <motion.span key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t.generateMaterials}
                    <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export default InputStep
