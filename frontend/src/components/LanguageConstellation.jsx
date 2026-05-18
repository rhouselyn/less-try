import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const FAMILIES = [
  {
    id: 'ie',
    name: '印欧',
    fullName: '印欧语系',
    color: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.15)',
    languages: [
      { code: 'en', name: 'English', supported: true },
      { code: 'fr', name: 'Français', supported: true },
      { code: 'es', name: 'Español', supported: true },
      { code: 'de', name: 'Deutsch', supported: true },
      { code: 'pt', name: 'Português' },
      { code: 'ru', name: 'Русский' },
      { code: 'it', name: 'Italiano' },
      { code: 'nl', name: 'Nederlands' },
      { code: 'pl', name: 'Polski' },
      { code: 'hi', name: 'हिन्दी' },
      { code: 'bn', name: 'বাংলা' },
      { code: 'fa', name: 'فارسی' },
      { code: 'sv', name: 'Svenska' },
      { code: 'uk', name: 'Українська' },
      { code: 'el', name: 'Ελληνικά' },
    ],
    extraCount: 48,
    pos: { x: 50, y: 82 },
    size: 380,
    radius: 140,
    hubSize: 52,
    rotateSpeed: 90,
    drift: [14, -10, -12, 14, 8, -8],
    driftDuration: 28,
  },
  {
    id: 'st',
    name: '汉藏',
    fullName: '汉藏语系',
    color: '#ef4444',
    glowColor: 'rgba(239,68,68,0.15)',
    languages: [
      { code: 'zh', name: '中文', supported: true },
      { code: 'zh-TW', name: '繁體中文' },
      { code: 'yue', name: '粵語' },
      { code: 'my', name: 'မြန်မာ' },
    ],
    extraCount: 0,
    pos: { x: 15, y: 36 },
    size: 220,
    radius: 75,
    hubSize: 44,
    rotateSpeed: 60,
    drift: [-8, 6, 10, -8, -6, 10],
    driftDuration: 22,
  },
  {
    id: 'aa',
    name: '闪含',
    fullName: '闪含语系',
    color: '#10b981',
    glowColor: 'rgba(16,185,129,0.15)',
    languages: [
      { code: 'ar', name: 'العربية' },
      { code: 'ar-najdi', name: 'نجدي' },
      { code: 'ar-levantine', name: 'شامي' },
      { code: 'ar-egypt', name: 'مصري' },
      { code: 'ar-moroccan', name: 'الدارجة' },
      { code: 'he', name: 'עברית' },
      { code: 'mt', name: 'Malti' },
      { code: 'ar-iraqi', name: 'عراقي' },
    ],
    extraCount: 2,
    pos: { x: 83, y: 32 },
    size: 260,
    radius: 95,
    hubSize: 44,
    rotateSpeed: 70,
    drift: [10, 8, -8, -10, 6, -6],
    driftDuration: 24,
  },
  {
    id: 'an',
    name: '南岛',
    fullName: '南岛语系',
    color: '#0ea5e9',
    glowColor: 'rgba(14,165,233,0.15)',
    languages: [
      { code: 'id', name: 'Indonesia' },
      { code: 'ms', name: 'Melayu' },
      { code: 'tl', name: 'Tagalog' },
      { code: 'ceb', name: 'Cebuano' },
      { code: 'jv', name: 'Jawa' },
      { code: 'su', name: 'Sunda' },
      { code: 'ban', name: 'Bali' },
      { code: 'min', name: 'Minang' },
    ],
    extraCount: 4,
    pos: { x: 73, y: 66 },
    size: 260,
    radius: 95,
    hubSize: 44,
    rotateSpeed: 65,
    drift: [-10, 6, 8, -12, 6, 8],
    driftDuration: 26,
  },
  {
    id: 'dr',
    name: '达罗毗荼',
    fullName: '达罗毗荼语系',
    color: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.15)',
    languages: [
      { code: 'ta', name: 'தமிழ்' },
      { code: 'te', name: 'తెలుగు' },
      { code: 'kn', name: 'ಕನ್ನಡ' },
      { code: 'ml', name: 'മലയാളം' },
    ],
    extraCount: 0,
    pos: { x: 32, y: 64 },
    size: 220,
    radius: 75,
    hubSize: 40,
    rotateSpeed: 55,
    drift: [8, -6, -10, 8, 6, -10],
    driftDuration: 20,
  },
  {
    id: 'tk',
    name: '突厥',
    fullName: '突厥语系',
    color: '#f97316',
    glowColor: 'rgba(249,115,22,0.15)',
    languages: [
      { code: 'tr', name: 'Türkçe' },
      { code: 'az', name: 'Azərbaycan' },
      { code: 'uz', name: "O'zbek" },
      { code: 'kk', name: 'Қазақша' },
      { code: 'ba', name: 'Башҡорт' },
      { code: 'tt', name: 'Татар' },
    ],
    extraCount: 0,
    pos: { x: 74, y: 14 },
    size: 240,
    radius: 85,
    hubSize: 44,
    rotateSpeed: 62,
    drift: [-6, 10, 8, -8, -10, 6],
    driftDuration: 23,
  },
  {
    id: 'td',
    name: '壮侗',
    fullName: '壮侗语系',
    color: '#84cc16',
    glowColor: 'rgba(132,204,22,0.15)',
    languages: [
      { code: 'th', name: 'ไทย' },
      { code: 'lo', name: 'ລາວ' },
    ],
    extraCount: 0,
    pos: { x: 14, y: 62 },
    size: 180,
    radius: 60,
    hubSize: 38,
    rotateSpeed: 50,
    drift: [6, -8, -6, 10, 8, -6],
    driftDuration: 18,
  },
  {
    id: 'ur',
    name: '乌拉尔',
    fullName: '乌拉尔语系',
    color: '#06b6d4',
    glowColor: 'rgba(6,182,212,0.15)',
    languages: [
      { code: 'fi', name: 'Suomi' },
      { code: 'et', name: 'Eesti' },
      { code: 'hu', name: 'Magyar' },
    ],
    extraCount: 0,
    pos: { x: 46, y: 10 },
    size: 200,
    radius: 68,
    hubSize: 40,
    rotateSpeed: 52,
    drift: [-8, 6, 10, -6, -8, 10],
    driftDuration: 19,
  },
  {
    id: 'as',
    name: '南亚',
    fullName: '南亚语系',
    color: '#ec4899',
    glowColor: 'rgba(236,72,153,0.15)',
    languages: [
      { code: 'vi', name: 'Tiếng Việt' },
      { code: 'km', name: 'ភាសាខ្មែរ' },
    ],
    extraCount: 0,
    pos: { x: 46, y: 42 },
    size: 180,
    radius: 60,
    hubSize: 38,
    rotateSpeed: 48,
    drift: [10, -6, -8, 8, 6, -8],
    driftDuration: 17,
  },
  {
    id: 'ot',
    name: '其他',
    fullName: '其他语系',
    color: '#6366f1',
    glowColor: 'rgba(99,102,241,0.15)',
    languages: [
      { code: 'ja', name: '日本語', supported: true },
      { code: 'ko', name: '한국어' },
      { code: 'ka', name: 'ქართული' },
      { code: 'eu', name: 'Euskara' },
      { code: 'sw', name: 'Swahili' },
      { code: 'ht', name: 'Haitian' },
    ],
    extraCount: 3,
    pos: { x: 22, y: 12 },
    size: 240,
    radius: 85,
    hubSize: 44,
    rotateSpeed: 58,
    drift: [8, 10, -6, -10, 8, -6],
    driftDuration: 21,
  },
]

function FamilyGroup({ family, selectedLang, onSelect, onHover }) {
  const [hovered, setHovered] = useState(false)

  const handleEnter = useCallback(() => {
    setHovered(true)
    onHover?.(true)
  }, [onHover])

  const handleLeave = useCallback(() => {
    setHovered(false)
    onHover?.(false)
  }, [onHover])

  const total = family.languages.length
  const cx = family.size / 2
  const cy = family.size / 2
  const spikeLengths = family.languages.map((_, i) =>
    family.radius + ((i * 7 + 3) % 5) * 8
  )

  return (
    <div
      className="absolute"
      style={{
        left: `${family.pos.x}%`,
        top: `${family.pos.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: hovered ? 20 : 1,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        className={`constellation-drift ${hovered ? 'constellation-paused' : ''}`}
        style={{
          animationName: `drift-${family.id}`,
          animationDuration: `${family.driftDuration}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
      >
        <div
          className={`constellation-spin ${hovered ? 'constellation-paused' : ''}`}
          style={{
            animationDuration: `${family.rotateSpeed}s`,
            width: family.size,
            height: family.size,
            position: 'relative',
          }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            width={family.size}
            height={family.size}
          >
            {family.languages.map((lang, i) => {
              const angle = (2 * Math.PI / total) * i - Math.PI / 2
              const r = spikeLengths[i]
              const ex = cx + Math.cos(angle) * r
              const ey = cy + Math.sin(angle) * r
              const dotR = 2.5
              const dotX = cx + Math.cos(angle) * (r - 8)
              const dotY = cy + Math.sin(angle) * (r - 8)
              return (
                <g key={i}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={dotX}
                    y2={dotY}
                    stroke={family.color}
                    strokeWidth={hovered ? 1.5 : 1}
                    opacity={hovered ? 0.5 : 0.2}
                    className="transition-all duration-300"
                  />
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r={dotR}
                    fill={family.color}
                    opacity={hovered ? 0.7 : 0.35}
                    className="transition-all duration-300"
                  />
                </g>
              )
            })}
          </svg>

          <div
            className="absolute rounded-full flex flex-col items-center justify-center constellation-counter-spin"
            style={{
              left: cx - family.hubSize / 2,
              top: cy - family.hubSize / 2,
              width: family.hubSize,
              height: family.hubSize,
              backgroundColor: family.color,
              color: 'white',
              fontSize: family.hubSize < 42 ? 10 : 12,
              fontWeight: 700,
              boxShadow: `0 0 ${hovered ? 28 : 16}px ${family.glowColor}, 0 2px 8px rgba(0,0,0,0.1)`,
              animationDuration: `${family.rotateSpeed}s`,
              transition: 'box-shadow 0.3s',
            }}
          >
            <span>{family.name}</span>
            {family.extraCount > 0 && (
              <span
                className="text-[8px] opacity-80 -mt-0.5"
                style={{ fontSize: family.hubSize < 42 ? 7 : 8 }}
              >
                +{family.extraCount}
              </span>
            )}
          </div>

          {family.languages.map((lang, i) => {
            const angle = (2 * Math.PI / total) * i - Math.PI / 2
            const r = spikeLengths[i]
            const x = cx + Math.cos(angle) * r
            const y = cy + Math.sin(angle) * r
            const isSupported = lang.supported
            const isSelected = lang.code === selectedLang

            return (
              <div
                key={lang.code}
                className="absolute"
                style={{ left: x, top: y }}
              >
                <button
                  className={`constellation-counter-spin whitespace-nowrap transition-all duration-200
                    ${hovered && isSupported ? 'hover:scale-110' : ''}
                    ${isSupported ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  style={{
                    animationDuration: `${family.rotateSpeed}s`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: isSupported ? 12 : 10,
                    color: isSelected
                      ? family.color
                      : isSupported
                        ? (hovered ? '#292524' : '#57534e')
                        : (hovered ? '#a8a29e' : '#d6d3d1'),
                    fontWeight: isSupported ? 600 : 400,
                    background: isSelected
                      ? `${family.glowColor}`
                      : 'transparent',
                    padding: isSelected ? '2px 8px' : '2px 4px',
                    borderRadius: isSelected ? 999 : 0,
                    border: isSelected ? `1.5px solid ${family.color}40` : 'none',
                  }}
                  onClick={() => isSupported && onSelect(lang.code)}
                >
                  {isSelected && (
                    <Check
                      className="inline w-3 h-3 mr-0.5 -mt-0.5"
                      style={{ color: family.color }}
                    />
                  )}
                  {lang.name}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LanguageConstellation({ sourceLang, setSourceLang }) {
  const [hoveredFamily, setHoveredFamily] = useState(null)

  useEffect(() => {
    const existing = document.getElementById('constellation-drift-styles')
    if (existing) return

    const style = document.createElement('style')
    style.id = 'constellation-drift-styles'
    style.textContent = FAMILIES.map(f => {
      const [d0, d1, d2, d3, d4, d5] = f.drift
      return `
        @keyframes drift-${f.id} {
          0%, 100% { transform: translate(0px, 0px); }
          25% { transform: translate(${d0}px, ${d1}px); }
          50% { transform: translate(${d2}px, ${d3}px); }
          75% { transform: translate(${d4}px, ${d5}px); }
        }
      `
    }).join('\n')
    document.head.appendChild(style)

    return () => {
      const el = document.getElementById('constellation-drift-styles')
      if (el) el.remove()
    }
  }, [])

  const selectedFamily = FAMILIES.find(f =>
    f.languages.some(l => l.code === sourceLang)
  )
  const selectedLangObj = selectedFamily?.languages.find(l => l.code === sourceLang)

  return (
    <div className="w-full">
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          height: 520,
          background: 'radial-gradient(ellipse at 50% 50%, #fafaf9 0%, #f5f5f4 60%, #e7e5e4 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #78716c 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {FAMILIES.map(family => (
          <FamilyGroup
            key={family.id}
            family={family}
            selectedLang={sourceLang}
            onSelect={setSourceLang}
            onHover={(h) => setHoveredFamily(h ? family.id : null)}
          />
        ))}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] text-stone-400 select-none pointer-events-none">
          <span>悬停语系可暂停旋转</span>
          <span>·</span>
          <span>点击高亮语种选择学习语言</span>
        </div>
      </div>

      {selectedLangObj && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-2"
        >
          <span className="text-sm text-stone-500">当前学习语言：</span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
            style={{
              backgroundColor: selectedFamily?.color + '18',
              color: selectedFamily?.color,
              border: `1px solid ${selectedFamily?.color}30`,
            }}
          >
            <Check className="w-3.5 h-3.5" />
            {selectedLangObj.name}
          </span>
          <span className="text-xs text-stone-400">({selectedFamily?.fullName})</span>
        </motion.div>
      )}
    </div>
  )
}

export default LanguageConstellation
