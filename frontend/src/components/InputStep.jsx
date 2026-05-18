import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Loader2, ArrowLeftRight, Sparkles, BookOpen, Search, X, ChevronDown, ChevronRight } from 'lucide-react'

const LANGUAGES = [
  { value: 'en', native: 'English', zh: '英语', family: 'indo-european', flag: '🇬🇧' },
  { value: 'fr', native: 'Français', zh: '法语', family: 'indo-european', flag: '🇫🇷' },
  { value: 'pt', native: 'Português', zh: '葡萄牙语', family: 'indo-european', flag: '🇵🇹' },
  { value: 'de', native: 'Deutsch', zh: '德语', family: 'indo-european', flag: '🇩🇪' },
  { value: 'ro', native: 'Română', zh: '罗马尼亚语', family: 'indo-european', flag: '🇷🇴' },
  { value: 'sv', native: 'Svenska', zh: '瑞典语', family: 'indo-european', flag: '🇸🇪' },
  { value: 'da', native: 'Dansk', zh: '丹麦语', family: 'indo-european', flag: '🇩🇰' },
  { value: 'bg', native: 'Български', zh: '保加利亚语', family: 'indo-european', flag: '🇧🇬' },
  { value: 'ru', native: 'Русский', zh: '俄语', family: 'indo-european', flag: '🇷🇺' },
  { value: 'cs', native: 'Čeština', zh: '捷克语', family: 'indo-european', flag: '🇨🇿' },
  { value: 'el', native: 'Ελληνικά', zh: '希腊语', family: 'indo-european', flag: '🇬🇷' },
  { value: 'uk', native: 'Українська', zh: '乌克兰语', family: 'indo-european', flag: '🇺🇦' },
  { value: 'es', native: 'Español', zh: '西班牙语', family: 'indo-european', flag: '🇪🇸' },
  { value: 'nl', native: 'Nederlands', zh: '荷兰语', family: 'indo-european', flag: '🇳🇱' },
  { value: 'sk', native: 'Slovenčina', zh: '斯洛伐克语', family: 'indo-european', flag: '🇸🇰' },
  { value: 'hr', native: 'Hrvatski', zh: '克罗地亚语', family: 'indo-european', flag: '🇭🇷' },
  { value: 'pl', native: 'Polski', zh: '波兰语', family: 'indo-european', flag: '🇵🇱' },
  { value: 'lt', native: 'Lietuvių', zh: '立陶宛语', family: 'indo-european', flag: '🇱🇹' },
  { value: 'nb', native: 'Norsk Bokmål', zh: '挪威布克莫尔语', family: 'indo-european', flag: '🇳🇴' },
  { value: 'nn', native: 'Norsk Nynorsk', zh: '挪威尼诺斯克语', family: 'indo-european', flag: '🇳🇴' },
  { value: 'fa', native: 'فارسی', zh: '波斯语', family: 'indo-european', flag: '🇮🇷' },
  { value: 'sl', native: 'Slovenščina', zh: '斯洛文尼亚语', family: 'indo-european', flag: '🇸🇮' },
  { value: 'gu', native: 'ગુજરાતી', zh: '古吉拉特语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'lv', native: 'Latviešu', zh: '拉脱维亚语', family: 'indo-european', flag: '🇱🇻' },
  { value: 'it', native: 'Italiano', zh: '意大利语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'oc', native: 'Occitan', zh: '奥克语', family: 'indo-european', flag: '🇫🇷' },
  { value: 'ne', native: 'नेपाली', zh: '尼泊尔语', family: 'indo-european', flag: '🇳🇵' },
  { value: 'mr', native: 'मराठी', zh: '马拉地语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'be', native: 'Беларуская', zh: '白俄罗斯语', family: 'indo-european', flag: '🇧🇾' },
  { value: 'sr', native: 'Српски', zh: '塞尔维亚语', family: 'indo-european', flag: '🇷🇸' },
  { value: 'lb', native: 'Lëtzebuergesch', zh: '卢森堡语', family: 'indo-european', flag: '🇱🇺' },
  { value: 'vec', native: 'Vèneto', zh: '威尼斯语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'as', native: 'অসমীয়া', zh: '阿萨姆语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'cy', native: 'Cymraeg', zh: '威尔士语', family: 'indo-european', flag: '🇬🇧' },
  { value: 'szl', native: 'Ślōnski', zh: '西里西亚语', family: 'indo-european', flag: '🇵🇱' },
  { value: 'ast', native: 'Asturianu', zh: '阿斯图里亚斯语', family: 'indo-european', flag: '🇪🇸' },
  { value: 'hne', native: 'छत्तीसगढ़ी', zh: '恰蒂斯加尔语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'awa', native: 'अवधी', zh: '阿瓦迪语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'mai', native: 'मैथिली', zh: '迈蒂利语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'bho', native: 'भोजपुरी', zh: '博杰普尔语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'sd', native: 'سنڌي', zh: '信德语', family: 'indo-european', flag: '🇵🇰' },
  { value: 'ga', native: 'Gaeilge', zh: '爱尔兰语', family: 'indo-european', flag: '🇮🇪' },
  { value: 'fo', native: 'Føroyskt', zh: '法罗语', family: 'indo-european', flag: '🇫🇴' },
  { value: 'hi', native: 'हिन्दी', zh: '印地语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'pa', native: 'ਪੰਜਾਬੀ', zh: '旁遮普语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'bn', native: 'বাংলা', zh: '孟加拉语', family: 'indo-european', flag: '🇧🇩' },
  { value: 'or', native: 'ଓଡ଼ିଆ', zh: '奥里亚语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'tg', native: 'Тоҷикӣ', zh: '塔吉克语', family: 'indo-european', flag: '🇹🇯' },
  { value: 'yi', native: 'ייִדיש', zh: '意第绪语', family: 'indo-european', flag: '🇮🇱' },
  { value: 'lmo', native: 'Lombard', zh: '伦巴第语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'lij', native: 'Lìgure', zh: '利古里亚语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'scn', native: 'Sicilianu', zh: '西西里语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'fur', native: 'Furlan', zh: '弗留利语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'sc', native: 'Sardu', zh: '撒丁语', family: 'indo-european', flag: '🇮🇹' },
  { value: 'gl', native: 'Galego', zh: '加利西亚语', family: 'indo-european', flag: '🇪🇸' },
  { value: 'ca', native: 'Català', zh: '加泰罗尼亚语', family: 'indo-european', flag: '🇪🇸' },
  { value: 'is', native: 'Íslenska', zh: '冰岛语', family: 'indo-european', flag: '🇮🇸' },
  { value: 'sq', native: 'Shqip', zh: '阿尔巴尼亚语', family: 'indo-european', flag: '🇦🇱' },
  { value: 'li', native: 'Limburgs', zh: '林堡语', family: 'indo-european', flag: '🇳🇱' },
  { value: 'prs', native: 'دری', zh: '达里语', family: 'indo-european', flag: '🇦🇫' },
  { value: 'af', native: 'Afrikaans', zh: '南非荷兰语', family: 'indo-european', flag: '🇿🇦' },
  { value: 'mk', native: 'Македонски', zh: '马其顿语', family: 'indo-european', flag: '🇲🇰' },
  { value: 'si', native: 'සිංහල', zh: '僧伽罗语', family: 'indo-european', flag: '🇱🇰' },
  { value: 'ur', native: 'اردو', zh: '乌尔都语', family: 'indo-european', flag: '🇵🇰' },
  { value: 'mag', native: 'मगही', zh: '马加伊语', family: 'indo-european', flag: '🇮🇳' },
  { value: 'bs', native: 'Bosanski', zh: '波斯尼亚语', family: 'indo-european', flag: '🇧🇦' },
  { value: 'hy', native: 'Հայերեն', zh: '亚美尼亚语', family: 'indo-european', flag: '🇦🇲' },
  { value: 'zh', native: '简体中文', zh: '简体中文', family: 'sino-tibetan', flag: '🇨🇳' },
  { value: 'zh-TW', native: '繁體中文', zh: '繁体中文', family: 'sino-tibetan', flag: '🇹🇼' },
  { value: 'yue', native: '粵語', zh: '粤语', family: 'sino-tibetan', flag: '🇭🇰' },
  { value: 'my', native: 'မြန်မာ', zh: '缅甸语', family: 'sino-tibetan', flag: '🇲🇲' },
  { value: 'ar', native: 'العربية', zh: '标准阿拉伯语', family: 'afro-asiatic', flag: '🇸🇦' },
  { value: 'ars', native: 'نجدي', zh: '内志阿拉伯语', family: 'afro-asiatic', flag: '🇸🇦' },
  { value: 'apc', native: 'شامي', zh: '黎凡特阿拉伯语', family: 'afro-asiatic', flag: '🇱🇧' },
  { value: 'arz', native: 'مصري', zh: '埃及阿拉伯语', family: 'afro-asiatic', flag: '🇪🇬' },
  { value: 'ary', native: 'الدارجة', zh: '摩洛哥阿拉伯语', family: 'afro-asiatic', flag: '🇲🇦' },
  { value: 'acm', native: 'العراقية', zh: '美索不达米亚阿拉伯语', family: 'afro-asiatic', flag: '🇮🇶' },
  { value: 'acq', native: 'يمني', zh: '塔伊兹-亚丁阿拉伯语', family: 'afro-asiatic', flag: '🇾🇪' },
  { value: 'aeb', native: 'تونسي', zh: '突尼斯阿拉伯语', family: 'afro-asiatic', flag: '🇹🇳' },
  { value: 'he', native: 'עברית', zh: '希伯来语', family: 'afro-asiatic', flag: '🇮🇱' },
  { value: 'mt', native: 'Malti', zh: '马耳他语', family: 'afro-asiatic', flag: '🇲🇹' },
  { value: 'id', native: 'Bahasa Indonesia', zh: '印尼语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'ms', native: 'Bahasa Melayu', zh: '马来语', family: 'austronesian', flag: '🇲🇾' },
  { value: 'tl', native: 'Tagalog', zh: '他加禄语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'ceb', native: 'Cebuano', zh: '宿务语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'jv', native: 'Basa Jawa', zh: '爪哇语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'su', native: 'Basa Sunda', zh: '巽他语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'min', native: 'Baso Minangkabau', zh: '米南加保语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'ban', native: 'Basa Bali', zh: '巴厘语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'bjn', native: 'Bahasa Banjar', zh: '班加尔语', family: 'austronesian', flag: '🇮🇩' },
  { value: 'pag', native: 'Pangasinan', zh: '邦阿西楠语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'ilo', native: 'Ilokano', zh: '伊洛卡诺语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'war', native: 'Waray', zh: '瓦瑞语', family: 'austronesian', flag: '🇵🇭' },
  { value: 'ta', native: 'தமிழ்', zh: '泰米尔语', family: 'dravidian', flag: '🇮🇳' },
  { value: 'te', native: 'తెలుగు', zh: '泰卢固语', family: 'dravidian', flag: '🇮🇳' },
  { value: 'kn', native: 'ಕನ್ನಡ', zh: '卡纳达语', family: 'dravidian', flag: '🇮🇳' },
  { value: 'ml', native: 'മലയാളം', zh: '马拉雅拉姆语', family: 'dravidian', flag: '🇮🇳' },
  { value: 'tr', native: 'Türkçe', zh: '土耳其语', family: 'turkic', flag: '🇹🇷' },
  { value: 'az', native: 'Azərbaycan', zh: '阿塞拜疆语', family: 'turkic', flag: '🇦🇿' },
  { value: 'uz', native: 'Oʻzbek', zh: '乌兹别克语', family: 'turkic', flag: '🇺🇿' },
  { value: 'kk', native: 'Қазақ', zh: '哈萨克语', family: 'turkic', flag: '🇰🇿' },
  { value: 'ba', native: 'Башҡорт', zh: '巴什基尔语', family: 'turkic', flag: '🇷🇺' },
  { value: 'tt', native: 'Татар', zh: '鞑靼语', family: 'turkic', flag: '🇷🇺' },
  { value: 'th', native: 'ไทย', zh: '泰语', family: 'tai-kadai', flag: '🇹🇭' },
  { value: 'lo', native: 'ລາວ', zh: '老挝语', family: 'tai-kadai', flag: '🇱🇦' },
  { value: 'fi', native: 'Suomi', zh: '芬兰语', family: 'uralic', flag: '🇫🇮' },
  { value: 'et', native: 'Eesti', zh: '爱沙尼亚语', family: 'uralic', flag: '🇪🇪' },
  { value: 'hu', native: 'Magyar', zh: '匈牙利语', family: 'uralic', flag: '🇭🇺' },
  { value: 'vi', native: 'Tiếng Việt', zh: '越南语', family: 'austroasiatic', flag: '🇻🇳' },
  { value: 'km', native: 'ភាសាខ្មែរ', zh: '高棉语', family: 'austroasiatic', flag: '🇰🇭' },
  { value: 'ja', native: '日本語', zh: '日语', family: 'other', flag: '🇯🇵' },
  { value: 'ko', native: '한국어', zh: '韩语', family: 'other', flag: '🇰🇷' },
  { value: 'ka', native: 'ქართული', zh: '格鲁吉亚语', family: 'other', flag: '🇬🇪' },
  { value: 'eu', native: 'Euskara', zh: '巴斯克语', family: 'other', flag: '🇪🇸' },
  { value: 'ht', native: 'Kreyòl Ayisyen', zh: '海地语', family: 'other', flag: '🇭🇹' },
  { value: 'pap', native: 'Papiamentu', zh: '帕皮阿门托语', family: 'other', flag: '🇦🇼' },
  { value: 'kea', native: 'Kabuverdianu', zh: '佛得角语', family: 'other', flag: '🇨🇻' },
  { value: 'tpi', native: 'Tok Pisin', zh: '托克皮辛语', family: 'other', flag: '🇵🇬' },
  { value: 'sw', native: 'Kiswahili', zh: '斯瓦希里语', family: 'other', flag: '🇰🇪' },
]

const FAMILIES = {
  'indo-european': { native: 'Indo-European', zh: '印欧语系' },
  'sino-tibetan': { native: 'Sino-Tibetan', zh: '汉藏语系' },
  'afro-asiatic': { native: 'Afro-Asiatic', zh: '亚非语系' },
  'austronesian': { native: 'Austronesian', zh: '南岛语系' },
  'dravidian': { native: 'Dravidian', zh: '达罗毗荼语系' },
  'turkic': { native: 'Turkic', zh: '突厥语系' },
  'tai-kadai': { native: 'Tai-Kadai', zh: '壮侗语系' },
  'uralic': { native: 'Uralic', zh: '乌拉尔语系' },
  'austroasiatic': { native: 'Austroasiatic', zh: '南亚语系' },
  'other': { native: 'Other', zh: '其他' },
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

const NATIVE_LANGUAGES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
]

function FloatingOrb({ className, delay = 0 }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
      animate={{
        y: [0, -20, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  )
}

function FloatingDot({ x, y, delay = 0, size = 4 }) {
  return (
    <motion.div
      className="absolute rounded-full bg-amber-400/30 pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

function LanguagePill({ label, value, selected, onClick, groupId }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
        selected
          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800'
      }`}
    >
      {selected && (
        <motion.div
          layoutId={groupId}
          className="absolute inset-0 bg-amber-500 rounded-full"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </motion.button>
  )
}

function LanguageSelector({ value, onChange, targetLang }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  const selectedLang = LANGUAGES.find((l) => l.value === value)

  const getLabel = (lang) => (targetLang === 'zh' ? lang.zh : lang.native)

  const filteredLanguages = LANGUAGES.filter((l) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      l.native.toLowerCase().includes(s) ||
      l.zh.includes(search) ||
      l.value.toLowerCase().includes(s)
    )
  })

  const groupedLanguages = FAMILY_ORDER.reduce((acc, family) => {
    const langs = filteredLanguages.filter((l) => l.family === family)
    if (langs.length > 0) acc[family] = langs
    return acc
  }, {})

  const toggleFamily = (family) => {
    setCollapsed((prev) => ({ ...prev, [family]: !prev[family] }))
  }

  const handleSelect = (langValue) => {
    onChange(langValue)
    setOpen(false)
    setSearch('')
  }

  const familyLabel = (family) =>
    FAMILIES[family][targetLang === 'zh' ? 'zh' : 'native']

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${
          open
            ? 'border-amber-400 bg-amber-50/50 shadow-sm shadow-amber-200/30'
            : 'border-stone-200 bg-white hover:border-amber-300 hover:shadow-sm'
        }`}
      >
        <span className="flex items-center gap-2.5">
          {selectedLang && (
            <span className="text-lg leading-none">{selectedLang.flag}</span>
          )}
          <span className="text-sm font-medium text-stone-700">
            {selectedLang ? getLabel(selectedLang) : value}
          </span>
          {targetLang === 'zh' && selectedLang && selectedLang.native !== selectedLang.zh && (
            <span className="text-xs text-stone-400">{selectedLang.native}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1.5 bg-white rounded-xl border border-stone-200 shadow-xl shadow-stone-200/40 overflow-hidden"
          >
            <div className="p-2.5 border-b border-stone-100">
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
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-stone-200 transition-colors"
                  >
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
                      className="w-full flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:bg-stone-50 transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span>{familyLabel(family)}</span>
                      <span className="text-stone-300 font-normal normal-case tracking-normal">
                        {langs.length}
                      </span>
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
                                value === lang.value
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              <span className="text-base leading-none flex-shrink-0">
                                {lang.flag}
                              </span>
                              <span
                                className={
                                  value === lang.value
                                    ? 'font-medium'
                                    : ''
                                }
                              >
                                {getLabel(lang)}
                              </span>
                              {targetLang === 'zh' &&
                                lang.native !== lang.zh && (
                                  <span className="text-xs text-stone-400">
                                    {lang.native}
                                  </span>
                                )}
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

function InputStep({ text, setText, sourceLang, setSourceLang, targetLang, setTargetLang, loading, onProcess, t }) {
  const [isFocused, setIsFocused] = useState(false)

  const handleSwap = () => {
    const temp = sourceLang
    setSourceLang(targetLang)
    setTargetLang(temp)
  }

  const isSwappable = sourceLang === 'zh' || sourceLang === 'en'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto relative"
    >
      <FloatingOrb className="w-72 h-72 bg-amber-300 -top-20 -left-32" delay={0} />
      <FloatingOrb className="w-56 h-56 bg-amber-200 -top-10 -right-24" delay={2} />
      <FloatingOrb className="w-48 h-48 bg-stone-300 top-40 -right-20" delay={4} />

      <FloatingDot x="8%" y="12%" delay={0} size={5} />
      <FloatingDot x="92%" y="8%" delay={0.8} size={4} />
      <FloatingDot x="85%" y="25%" delay={1.6} size={6} />
      <FloatingDot x="5%" y="35%" delay={2.4} size={3} />
      <FloatingDot x="95%" y="55%" delay={1.2} size={5} />
      <FloatingDot x="3%" y="65%" delay={3.0} size={4} />

      <div className="relative z-10">
        <div className="text-center mb-14">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200/60 mb-6"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">少邻国 / Lesslingo</span>
          </motion.div>

          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-5xl font-bold text-stone-800 mb-4 tracking-tight"
          >
            {t.startLearning}
          </motion.h2>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-lg text-stone-500 max-w-md mx-auto leading-relaxed"
          >
            {t.inputHint}
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/60 shadow-xl shadow-stone-200/30 p-8 space-y-8"
        >
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">{t.learnLang}</span>
              </div>
              <LanguageSelector
                value={sourceLang}
                onChange={setSourceLang}
                targetLang={targetLang}
              />
            </div>

            <div className="flex items-center justify-center">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSwap}
                disabled={!isSwappable}
                className={`p-2.5 rounded-full border transition-all duration-200 ${
                  isSwappable
                    ? 'border-stone-200 bg-stone-50 text-stone-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600'
                    : 'border-stone-100 bg-stone-50 text-stone-300 cursor-not-allowed'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </motion.button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Languages className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">{t.nativeLang}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {NATIVE_LANGUAGES.map((lang) => (
                  <LanguagePill
                    key={lang.value}
                    label={lang.label}
                    value={lang.value}
                    selected={targetLang === lang.value}
                    onClick={() => setTargetLang(lang.value)}
                    groupId="target-pill"
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">{t.inputText}</span>
            </label>
            <div
              className={`relative rounded-2xl p-[2px] transition-all duration-300 ${
                isFocused
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-gradient-to-r from-stone-200 via-stone-200 to-stone-200'
              }`}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={t.placeholder}
                className="w-full h-56 px-5 py-4 rounded-[14px] bg-white text-stone-800 placeholder-stone-400 focus:outline-none resize-none text-base leading-relaxed"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onProcess}
            disabled={loading || !text.trim()}
            className={`w-full py-4 font-semibold rounded-2xl flex items-center justify-center gap-2.5 text-base transition-all duration-300 ${
              loading || !text.trim()
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:from-amber-600 hover:to-amber-700'
            }`}
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2.5"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.processing}
                </motion.span>
              ) : (
                <motion.span
                  key="ready"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2.5"
                >
                  <Sparkles className="w-5 h-5" />
                  {t.generateMaterials}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default InputStep
