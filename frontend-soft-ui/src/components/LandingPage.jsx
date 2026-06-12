import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Languages, Mic, Sparkles, Brain, Trophy, ArrowRight, Zap, Globe, Volume2, PenTool, ChevronDown } from 'lucide-react'

/** 青蛙 Logo - Pop Art 风格 */
function FrogMascot({ size = 120, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="100" cy="120" rx="70" ry="55" fill="#39FF14" stroke="#000" strokeWidth="6" />
      <ellipse cx="100" cy="115" rx="62" ry="48" fill="#5CFF41" />
      <circle cx="68" cy="72" r="30" fill="#39FF14" stroke="#000" strokeWidth="6" />
      <circle cx="68" cy="72" r="24" fill="#FFF" stroke="#000" strokeWidth="4" />
      <circle cx="72" cy="68" r="10" fill="#000" />
      <circle cx="75" cy="65" r="3" fill="#FFF" />
      <circle cx="132" cy="72" r="30" fill="#39FF14" stroke="#000" strokeWidth="6" />
      <circle cx="132" cy="72" r="24" fill="#FFF" stroke="#000" strokeWidth="4" />
      <circle cx="136" cy="68" r="10" fill="#000" />
      <circle cx="139" cy="65" r="3" fill="#FFF" />
      <ellipse cx="100" cy="130" rx="32" ry="14" fill="#FFD700" stroke="#000" strokeWidth="4" />
      <path d="M74 126 Q100 146 126 126" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="55" cy="110" rx="12" ry="8" fill="#FF69B4" opacity="0.6" />
      <ellipse cx="145" cy="110" rx="12" ry="8" fill="#FF69B4" opacity="0.6" />
    </svg>
  )
}

/** 半色调网点背景 */
function HalftoneOverlay({ color = '#FF69B4', opacity = 0.08 }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
        opacity,
      }}
    />
  )
}

/** 星星装饰 */
function PopStar({ x, y, size = 40, color = '#FFD700', delay = 0 }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ scale: 0, rotate: 0 }}
      animate={{ scale: [0, 1.2, 1], rotate: [0, 180, 360] }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40">
        <polygon points="20,0 25,15 40,15 28,24 32,40 20,30 8,40 12,24 0,15 15,15" fill={color} stroke="#000" strokeWidth="2" />
      </svg>
    </motion.div>
  )
}

/** 特色功能卡片 */
function FeatureCard({ icon: Icon, title, description, color, delay = 0 }) {
  return (
    <motion.div
      className="bg-white border-4 border-black shadow-pop-lg p-6 hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all group"
      initial={{ y: 40, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <div
        className="w-14 h-14 flex items-center justify-center border-4 border-black shadow-pop-sm mb-4 group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-7 h-7 text-black" strokeWidth={3} />
      </div>
      <h3 className="font-landing text-xl md:text-2xl mb-2 text-black uppercase tracking-wide">{title}</h3>
      <p className="font-landingBody font-bold text-sm md:text-base text-black/70">{description}</p>
    </motion.div>
  )
}

export default function LandingPage({ onStartLearning }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div className="min-h-screen bg-pop-cream font-landingBody overflow-y-auto">
      {/* 导航栏 */}
      <nav className={`sticky top-0 z-50 bg-white border-b-4 border-black px-4 md:px-8 py-3 md:py-4 transition-all ${scrolled ? 'shadow-pop' : ''}`}>
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <a href="#" className="flex items-center gap-3">
            <FrogMascot size={44} />
            <span className="font-landing text-2xl md:text-3xl tracking-wider text-black">呱邻国</span>
          </a>
          <div className="hidden md:flex items-center gap-8 font-landingBody font-bold text-sm">
            <a href="#features" className="hover:text-pop-red transition-colors">特色功能</a>
            <a href="#compare" className="hover:text-pop-red transition-colors">对比多邻国</a>
            <a href="#modes" className="hover:text-pop-red transition-colors">学习模式</a>
          </div>
          <button
            onClick={onStartLearning}
            className="bg-pop-red text-white font-landing text-lg px-4 py-2 md:px-6 md:py-3 border-4 border-black shadow-pop hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all tracking-wider"
          >
            开始学习
          </button>
        </div>
      </nav>

      {/* Hero 区块 */}
      <section className="min-h-[80vh] flex items-center relative overflow-hidden bg-pop-yellow border-b-4 border-black">
        <HalftoneOverlay color="#000" opacity={0.04} />
        <PopStar x="5%" y="15%" size={50} color="#FF006E" delay={0.2} />
        <PopStar x="90%" y="20%" size={35} color="#00BFFF" delay={0.4} />
        <PopStar x="85%" y="70%" size={45} color="#FF69B4" delay={0.6} />
        <PopStar x="10%" y="75%" size={30} color="#39FF14" delay={0.8} />

        <div className="max-w-6xl mx-auto px-4 md:px-8 w-full py-16">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
                <div className="inline-block bg-pop-red text-white font-landing text-sm md:text-base px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest mb-6">
                  AI 驱动 · 全新体验
                </div>
              </motion.div>

              <motion.h1
                className="font-landing text-5xl md:text-7xl lg:text-8xl leading-none tracking-tight mb-6 text-black"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                学语言<br />
                <span className="text-pop-red">做自己</span>
                <span className="inline-block animate-wiggle">!</span>
              </motion.h1>

              <motion.p
                className="font-landingBody font-bold text-base md:text-xl max-w-xl mb-8 text-black/80"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                粘贴任何文本，AI 自动生成词汇表、分句翻译和多种练习题。<br />
                任何语言 → 任何语言，你的素材你做主。
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <button
                  onClick={onStartLearning}
                  className="bg-pop-red text-white font-landing text-xl md:text-2xl px-8 py-4 border-4 border-black shadow-pop-lg hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all tracking-wider"
                >
                  免费开始 <ArrowRight className="inline w-6 h-6 ml-2" />
                </button>
                <a
                  href="#features"
                  className="bg-white text-black font-landing text-xl md:text-2xl px-8 py-4 border-4 border-black shadow-pop-lg hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all tracking-wider text-center"
                >
                  了解更多
                </a>
              </motion.div>
            </div>

            <motion.div
              className="flex-1 flex flex-col items-center relative"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4, type: 'spring' }}
            >
              <div className="relative">
                <FrogMascot size={180} className="animate-float drop-shadow-2xl" />
                <motion.div
                  className="absolute -top-14 -right-8"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring', stiffness: 200 }}
                >
                  <div className="bg-white border-4 border-black px-4 py-3 shadow-pop-sm font-landing text-lg md:text-xl text-black relative">
                    呱！开冲！
                    <div className="absolute -bottom-3 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black" />
                    <div className="absolute -bottom-2 left-7 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-white" />
                  </div>
                </motion.div>
              </div>
              <div className="flex gap-3 mt-6">
                {['#FF006E', '#00BFFF', '#FFD700', '#39FF14', '#BF5FFF'].map((color, i) => (
                  <motion.div
                    key={color}
                    className="w-8 h-8 md:w-10 md:h-10 border-4 border-black"
                    style={{ backgroundColor: color }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2" animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ChevronDown className="w-8 h-8 text-black/40" />
        </motion.div>
      </section>

      {/* 特色功能 */}
      <section id="features" className="py-16 md:py-20 px-4 md:px-8 bg-pop-cream relative">
        <HalftoneOverlay color="#FF006E" opacity={0.03} />
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-12" initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <span className="font-landing text-sm bg-pop-blue text-black px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest inline-block">特色功能</span>
            <h2 className="font-landing text-3xl md:text-5xl mt-6 text-black">多邻国做不到的<br /><span className="text-pop-red">呱邻国做到了</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, title: 'AI 自动生成', desc: '粘贴任何文本，AI 自动检测语言、分句翻译、提取词汇，为你量身定制学习内容。', color: '#FFD700' },
              { icon: Languages, title: '任意语言互学', desc: '支持 120+ 种语言 TTS 朗读，AI 自动检测语种，不再受限于平台资源。', color: '#00BFFF' },
              { icon: BookOpen, title: '完整词汇表', desc: '自动生成完整词汇表，支持字母索引、搜索、逐词详情，随时查阅每个单词。', color: '#39FF14' },
              { icon: Mic, title: '语音朗读', desc: '基于浏览器原生 TTS，单词和句子都能朗读，常速/慢速自由切换。', color: '#FF69B4' },
              { icon: Brain, title: '两阶段学习', desc: '阶段一词汇认知，阶段二综合训练，循序渐进掌握每个知识点。', color: '#BF5FFF' },
              { icon: Trophy, title: '星级评价', desc: '每个单元完成后获得星级评价，答错的题自动进入错题回顾。', color: '#FF6B35' },
            ].map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.desc} color={f.color} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* 对比区块 */}
      <section id="compare" className="py-16 md:py-20 px-4 md:px-8 bg-pop-blue border-y-4 border-black relative">
        <HalftoneOverlay color="#000" opacity={0.05} />
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-12" initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <h2 className="font-landing text-3xl md:text-5xl text-black">为什么选择<span className="text-pop-red">呱邻国</span>？</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              ['没有单词表，复习无门', '自动生成完整词汇表'],
              ['做题时想查其它单词', '学习过程中随时打开单词表'],
              ['学了也很难用上', '你提供什么素材就学什么'],
              ['小众语种不支持', '支持任意语言互学，120+ TTS'],
              ['无法深入理解一篇文章', 'AI 分句翻译，彻底吃透'],
            ].map((item, i) => (
              <motion.div key={i} className="flex flex-col md:flex-row gap-2 md:gap-4" initial={{ x: -30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="flex-1 bg-white/60 border-4 border-black p-3 shadow-pop-sm">
                  <span className="font-landing text-xs text-black/50 tracking-wider">多邻国</span>
                  <p className="font-landingBody font-bold text-sm md:text-base text-black/70 mt-1">{item[0]}</p>
                </div>
                <div className="flex items-center justify-center"><ArrowRight className="w-5 h-5 text-black rotate-90 md:rotate-0" /></div>
                <div className="flex-1 bg-pop-yellow border-4 border-black p-3 shadow-pop">
                  <span className="font-landing text-xs text-black/70 tracking-wider">呱邻国</span>
                  <p className="font-landingBody font-bold text-sm md:text-base text-black mt-1">{item[1]}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 三种学习模式 */}
      <section id="modes" className="py-16 md:py-20 px-4 md:px-8 bg-pop-cream relative">
        <HalftoneOverlay color="#BF5FFF" opacity={0.03} />
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-12" initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <span className="font-landing text-sm bg-pop-pink text-black px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest inline-block">三种模式</span>
            <h2 className="font-landing text-3xl md:text-5xl mt-6 text-black">你的素材<span className="text-pop-red">你做主</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: PenTool, title: '直接输入', sub: '我有素材，想直接学', desc: '粘贴一篇文章、一首歌词、一段新闻——任何外语文本丢进来，AI 自动检测语言、分句翻译、提取词汇。', bg: 'bg-pop-red' },
              { icon: Globe, title: '自动翻译', sub: '我想用母语素材来学外语', desc: '输入你母语的文本，AI 翻译成你想学的语言，然后基于翻译后的文本生成词汇和练习。', bg: 'bg-pop-blue' },
              { icon: Sparkles, title: '自由生成', sub: '我没有素材，帮我生成', desc: '告诉 AI 你想学什么主题，AI 自动生成目标语言的文本，然后开始学习。没有素材也能学。', bg: 'bg-pop-green' },
            ].map((m, i) => (
              <motion.div key={m.title} className="bg-white border-4 border-black shadow-pop-lg overflow-hidden" initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                <div className={`${m.bg} p-4 border-b-4 border-black`}><m.icon className="w-9 h-9 text-black mx-auto" strokeWidth={3} /></div>
                <div className="p-6">
                  <h3 className="font-landing text-2xl text-black uppercase tracking-wide mb-1">{m.title}</h3>
                  <p className="font-landingBody font-bold text-sm text-pop-red mb-3">{m.sub}</p>
                  <p className="font-landingBody font-bold text-sm text-black/70">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 学习体系 */}
      <section className="py-16 md:py-20 px-4 md:px-8 bg-pop-cream relative">
        <HalftoneOverlay color="#FFD700" opacity={0.03} />
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-12" initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <span className="font-landing text-sm bg-pop-green text-black px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest inline-block">学习体系</span>
            <h2 className="font-landing text-3xl md:text-5xl mt-6 text-black">两阶段 + 错题回顾</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div className="bg-white border-4 border-black shadow-pop-lg p-6" initial={{ x: -30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <div className="bg-pop-blue border-4 border-black px-4 py-2 inline-block shadow-pop-sm mb-4"><span className="font-landing text-xl text-black tracking-wider">阶段一 · 词汇认知</span></div>
              {[{ i: BookOpen, t: '单词选择 — 四选一，看单词选释义', c: '#FF006E' }, { i: Languages, t: '句子翻译 — 看源语言句子，拼出翻译', c: '#00BFFF' }, { i: Volume2, t: '听力理解 — 听句子，拼出听到的内容', c: '#FFD700' }].map((x, i) => (
                <div key={i} className="flex items-start gap-3 mt-3">
                  <div className="w-8 h-8 flex items-center justify-center border-2 border-black shrink-0" style={{ backgroundColor: x.c }}><x.i className="w-4 h-4 text-black" strokeWidth={3} /></div>
                  <span className="font-landingBody font-bold text-sm text-black/80">{x.t}</span>
                </div>
              ))}
            </motion.div>
            <motion.div className="bg-white border-4 border-black shadow-pop-lg p-6" initial={{ x: 30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <div className="bg-pop-yellow border-4 border-black px-4 py-2 inline-block shadow-pop-sm mb-4"><span className="font-landing text-xl text-black tracking-wider">阶段二 · 综合训练</span></div>
              {[{ i: PenTool, t: '遮蔽填空 — 句子中挖空关键词，选择正确答案', c: '#39FF14' }, { i: Brain, t: '翻译重组 — 看母语翻译，还原原句', c: '#BF5FFF' }].map((x, i) => (
                <div key={i} className="flex items-start gap-3 mt-3">
                  <div className="w-8 h-8 flex items-center justify-center border-2 border-black shrink-0" style={{ backgroundColor: x.c }}><x.i className="w-4 h-4 text-black" strokeWidth={3} /></div>
                  <span className="font-landingBody font-bold text-sm text-black/80">{x.t}</span>
                </div>
              ))}
              <div className="mt-6 bg-pop-pink/30 border-4 border-black p-4 shadow-pop-sm">
                <div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-black" strokeWidth={3} /><span className="font-landing text-lg text-black tracking-wider">错题回顾</span></div>
                <p className="font-landingBody font-bold text-sm text-black/70 mt-2">答错的题自动收集，强化练习直到掌握为止</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-4 md:px-8 bg-pop-red border-y-4 border-black relative overflow-hidden">
        <HalftoneOverlay color="#FFF" opacity={0.05} />
        <div className="absolute top-8 left-8 opacity-10"><FrogMascot size={70} /></div>
        <div className="absolute bottom-8 right-8 opacity-10"><FrogMascot size={50} /></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <h2 className="font-landing text-4xl md:text-6xl text-white mb-6">准备好了吗？</h2>
            <p className="font-landingBody font-bold text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              只需一个 API Key，无需数据库，纯 LLM 能力驱动一切。<br />
              任何语言 → 任何语言，你的素材你做主。
            </p>
            <button
              onClick={onStartLearning}
              className="bg-pop-yellow text-black font-landing text-2xl md:text-3xl px-10 py-5 border-4 border-black shadow-pop-xl hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all tracking-wider"
            >
              立即开始 <Zap className="inline w-7 h-7 ml-2" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-black text-white py-12 px-4 md:px-8 border-t-4 border-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4"><FrogMascot size={36} /><span className="font-landing text-2xl tracking-wider">呱邻国</span></div>
              <p className="font-landingBody font-bold text-sm text-white/50">完全由 AI 驱动。输入 API，实现语言自由。</p>
            </div>
            <div>
              <h4 className="font-landing text-lg mb-4 tracking-wider">技术栈</h4>
              <ul className="space-y-2 font-landingBody font-bold text-sm text-white/50">
                <li>React 18 · Vite · TailwindCSS</li>
                <li>FastAPI · OpenAI 兼容 LLM API</li>
                <li>Web Speech API · Framer Motion</li>
              </ul>
            </div>
            <div>
              <h4 className="font-landing text-lg mb-4 tracking-wider">开源协议</h4>
              <p className="font-landingBody font-bold text-sm text-white/50">GNU GPL v3 License</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t-2 border-white/20 text-center">
            <p className="font-landingBody font-bold text-sm text-white/30">© 2024 呱邻国 Lesslingo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}