import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Languages, Mic, Sparkles, Brain, Trophy, ArrowRight, Zap, Globe, Volume2, PenTool, ChevronDown } from 'lucide-react'

// 青蛙 Logo 组件 - Pop Art 风格
function FrogMascot({ size = 120, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 身体 */}
      <ellipse cx="100" cy="120" rx="70" ry="55" fill="#39FF14" stroke="#000" strokeWidth="6" />
      <ellipse cx="100" cy="115" rx="62" ry="48" fill="#5CFF41" />
      {/* 左眼 */}
      <circle cx="68" cy="72" r="30" fill="#39FF14" stroke="#000" strokeWidth="6" />
      <circle cx="68" cy="72" r="24" fill="#FFF" stroke="#000" strokeWidth="4" />
      <circle cx="72" cy="68" r="10" fill="#000" />
      <circle cx="75" cy="65" r="3" fill="#FFF" />
      {/* 右眼 */}
      <circle cx="132" cy="72" r="30" fill="#39FF14" stroke="#000" strokeWidth="6" />
      <circle cx="132" cy="72" r="24" fill="#FFF" stroke="#000" strokeWidth="4" />
      <circle cx="136" cy="68" r="10" fill="#000" />
      <circle cx="139" cy="65" r="3" fill="#FFF" />
      {/* 嘴巴 */}
      <ellipse cx="100" cy="130" rx="32" ry="14" fill="#FFD700" stroke="#000" strokeWidth="4" />
      <path d="M74 126 Q100 146 126 126" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* 腮红 */}
      <ellipse cx="55" cy="110" rx="12" ry="8" fill="#FF69B4" opacity="0.6" />
      <ellipse cx="145" cy="110" rx="12" ry="8" fill="#FF69B4" opacity="0.6" />
    </svg>
  )
}

// 漫画对话泡泡
function SpeechBubble({ children, color = 'bg-pop-yellow', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div className={`${color} border-4 border-black rounded-lg px-6 py-4 shadow-pop font-display text-xl md:text-2xl text-black`}>
        {children}
      </div>
      <div className="absolute -bottom-4 left-8 w-0 h-0 border-l-[12px] border-l-black border-r-[12px] border-r-transparent border-t-[12px] border-t-black" />
      <div className="absolute -bottom-2 left-9 w-0 h-0 border-l-[10px] border-l-yellow-400 border-r-[10px] border-r-transparent border-t-[10px] border-t-yellow-400" style={{ borderColor: 'inherit' }} />
    </div>
  )
}

// 半色调网点背景
function HalftoneOverlay({ color = '#FF69B4', opacity = 0.08 }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
        opacity: opacity,
      }}
    />
  )
}

// 漫画动作线条
function ActionLines({ className = '' }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute bg-black"
          style={{
            width: '2px',
            height: `${20 + Math.random() * 30}px`,
            transform: `rotate(${i * 45}deg)`,
            transformOrigin: 'center bottom',
            top: '50%',
            left: '50%',
            opacity: 0.15,
          }}
        />
      ))}
    </div>
  )
}

// 星星装饰
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
        <polygon
          points="20,0 25,15 40,15 28,24 32,40 20,30 8,40 12,24 0,15 15,15"
          fill={color}
          stroke="#000"
          strokeWidth="2"
        />
      </svg>
    </motion.div>
  )
}

// 导航栏
function Navbar({ onStartLearning }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-black px-4 md:px-8 py-3 md:py-4 transition-all duration-150 ${scrolled ? 'shadow-pop' : ''}`}>
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <a href="#" className="flex items-center gap-3">
          <FrogMascot size={48} />
          <span className="font-display text-2xl md:text-3xl tracking-wider text-black">
            呱邻国
          </span>
        </a>
        <div className="hidden md:flex items-center gap-8 font-body font-bold text-sm">
          <a href="#features" className="hover:text-pop-red transition-colors">特色功能</a>
          <a href="#how" className="hover:text-pop-red transition-colors">如何使用</a>
          <a href="#modes" className="hover:text-pop-red transition-colors">学习模式</a>
        </div>
        <button
          onClick={onStartLearning}
          className="bg-pop-red text-white font-display text-lg px-4 py-2 md:px-6 md:py-3 border-4 border-black shadow-pop hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all tracking-wider"
        >
          开始学习
        </button>
      </div>
    </nav>
  )
}

// Hero 区块
function HeroSection({ onStartLearning }) {
  return (
    <section className="min-h-[90vh] md:min-h-screen flex items-center relative overflow-hidden bg-pop-yellow border-b-4 border-black pt-20">
      <HalftoneOverlay color="#000" opacity={0.04} />

      {/* 装饰元素 */}
      <PopStar x="5%" y="15%" size={50} color="#FF006E" delay={0.2} />
      <PopStar x="90%" y="20%" size={35} color="#00BFFF" delay={0.4} />
      <PopStar x="85%" y="70%" size={45} color="#FF69B4" delay={0.6} />
      <PopStar x="10%" y="75%" size={30} color="#39FF14" delay={0.8} />

      {/* 漫画爆炸装饰 */}
      <div className="absolute top-24 right-8 md:right-20 animate-pulse-pop">
        <svg width="120" height="120" viewBox="0 0 120 120" className="opacity-20">
          <polygon points="60,0 70,40 110,20 80,55 120,60 80,65 110,100 70,80 60,120 50,80 10,100 40,65 0,60 40,55 10,20 50,40" fill="#FF006E" stroke="#000" strokeWidth="3" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 w-full">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          {/* 左侧文字 */}
          <div className="flex-1 text-center md:text-left">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block bg-pop-red text-white font-display text-sm md:text-base px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest mb-6">
                AI 驱动 · 全新体验
              </div>
            </motion.div>

            <motion.h1
              className="font-display text-5xl md:text-7xl lg:text-9xl leading-none tracking-tight mb-6 text-black"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              学语言<br />
              <span className="text-pop-red">做自己</span>
              <span className="inline-block animate-wiggle">!</span>
            </motion.h1>

            <motion.p
              className="font-body font-bold text-base md:text-xl max-w-xl mb-8 text-black/80"
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
                className="bg-pop-red text-white font-display text-xl md:text-2xl px-8 py-4 border-4 border-black shadow-pop-lg hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all tracking-wider"
              >
                免费开始 <ArrowRight className="inline w-6 h-6 ml-2" />
              </button>
              <a
                href="#features"
                className="bg-white text-black font-display text-xl md:text-2xl px-8 py-4 border-4 border-black shadow-pop-lg hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all tracking-wider text-center"
              >
                了解更多
              </a>
            </motion.div>
          </div>

          {/* 右侧青蛙 + 对话泡泡 */}
          <motion.div
            className="flex-1 flex flex-col items-center relative"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, type: 'spring' }}
          >
            <div className="relative">
              <FrogMascot size={200} className="animate-float drop-shadow-2xl" />

              {/* 对话泡泡 */}
              <motion.div
                className="absolute -top-16 -right-8 md:-right-16"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: 'spring', stiffness: 200 }}
              >
                <div className="bg-white border-4 border-black rounded-lg px-4 py-3 shadow-pop-sm font-display text-lg md:text-xl text-black relative">
                  呱！开冲！
                  <div className="absolute -bottom-3 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black" />
                  <div className="absolute -bottom-2 left-7 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-white" />
                </div>
              </motion.div>
            </div>

            {/* 装饰色块 */}
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

      {/* 底部滚动提示 */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <ChevronDown className="w-8 h-8 text-black/40" />
      </motion.div>
    </section>
  )
}

// 特色功能卡片
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
      <h3 className="font-display text-xl md:text-2xl mb-2 text-black uppercase tracking-wide">
        {title}
      </h3>
      <p className="font-body font-bold text-sm md:text-base text-black/70">
        {description}
      </p>
    </motion.div>
  )
}

// 特色功能区块
function FeaturesSection() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI 自动生成',
      description: '粘贴任何文本，AI 自动检测语言、分句翻译、提取词汇，为你量身定制学习内容。',
      color: '#FFD700',
    },
    {
      icon: Languages,
      title: '任意语言互学',
      description: '支持 120+ 种语言 TTS 朗读，AI 自动检测语种，不再受限于平台资源。',
      color: '#00BFFF',
    },
    {
      icon: BookOpen,
      title: '完整词汇表',
      description: '自动生成完整词汇表，支持字母索引、搜索、逐词详情，随时查阅每个单词。',
      color: '#39FF14',
    },
    {
      icon: Mic,
      title: '语音朗读',
      description: '基于浏览器原生 TTS，单词和句子都能朗读，常速/慢速自由切换。',
      color: '#FF69B4',
    },
    {
      icon: Brain,
      title: '两阶段学习',
      description: '阶段一词汇认知，阶段二综合训练，循序渐进掌握每个知识点。',
      color: '#BF5FFF',
    },
    {
      icon: Trophy,
      title: '星级评价',
      description: '每个单元完成后获得星级评价，答错的题自动进入错题回顾，直到掌握为止。',
      color: '#FF6B35',
    },
  ]

  return (
    <section id="features" className="py-16 md:py-24 px-4 md:px-8 bg-pop-cream relative">
      <HalftoneOverlay color="#FF006E" opacity={0.03} />

      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="font-display text-sm md:text-base bg-pop-blue text-black px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest">
            特色功能
          </span>
          <h2 className="font-display text-3xl md:text-5xl mt-6 text-black">
            多邻国做不到的<br />
            <span className="text-pop-red">呱邻国做到了</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  )
}

// 对比区块 - 呱邻国 vs 多邻国
function CompareSection() {
  const comparisons = [
    { duo: '没有单词表，复习无门', gua: '自动生成完整词汇表，支持字母索引、搜索、逐词详情' },
    { duo: '做题时想查其它单词', gua: '学习过程中随时打开单词表，不打断学习节奏' },
    { duo: '学了也很难用上', gua: '你提供什么素材就学什么——歌词、新闻、台词、论文' },
    { duo: '小众语种不支持', gua: '支持任意语言互学，120+ 种语言 TTS 朗读' },
    { duo: '无法深入理解一篇文章', gua: 'AI 分句翻译、提取全部词汇、生成练习题，彻底吃透' },
  ]

  return (
    <section className="py-16 md:py-24 px-4 md:px-8 bg-pop-blue border-y-4 border-black relative">
      <HalftoneOverlay color="#000" opacity={0.05} />

      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl md:text-5xl text-black">
            为什么选择<span className="text-pop-red">呱邻国</span>？
          </h2>
        </motion.div>

        <div className="space-y-4">
          {comparisons.map((item, i) => (
            <motion.div
              key={i}
              className="flex flex-col md:flex-row gap-4"
              initial={{ x: -30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex-1 bg-white/60 border-4 border-black p-4 shadow-pop-sm">
                <span className="font-display text-sm text-black/50 tracking-wider">多邻国</span>
                <p className="font-body font-bold text-sm md:text-base text-black/70 mt-1">{item.duo}</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-black rotate-90 md:rotate-0" />
              </div>
              <div className="flex-1 bg-pop-yellow border-4 border-black p-4 shadow-pop">
                <span className="font-display text-sm text-black/70 tracking-wider">呱邻国</span>
                <p className="font-body font-bold text-sm md:text-base text-black mt-1">{item.gua}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 学习模式区块
function ModesSection() {
  const modes = [
    {
      icon: PenTool,
      title: '直接输入',
      subtitle: '我有素材，想直接学',
      description: '粘贴一篇文章、一首歌词、一段新闻——任何外语文本丢进来，AI 自动检测语言、分句翻译、提取词汇。',
      color: '#FF006E',
      bg: 'bg-pop-red',
    },
    {
      icon: Globe,
      title: '自动翻译',
      subtitle: '我想用母语素材来学外语',
      description: '输入你母语的文本，AI 翻译成你想学的语言，然后基于翻译后的文本生成词汇和练习。',
      color: '#00BFFF',
      bg: 'bg-pop-blue',
    },
    {
      icon: Sparkles,
      title: '自由生成',
      subtitle: '我没有素材，帮我生成',
      description: '告诉 AI 你想学什么主题，AI 自动生成目标语言的文本，然后开始学习。没有素材也能学。',
      color: '#39FF14',
      bg: 'bg-pop-green',
    },
  ]

  return (
    <section id="modes" className="py-16 md:py-24 px-4 md:px-8 bg-pop-cream relative">
      <HalftoneOverlay color="#BF5FFF" opacity={0.03} />

      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="font-display text-sm md:text-base bg-pop-pink text-black px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest">
            三种模式
          </span>
          <h2 className="font-display text-3xl md:text-5xl mt-6 text-black">
            你的素材<span className="text-pop-red">你做主</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode, i) => (
            <motion.div
              key={mode.title}
              className="bg-white border-4 border-black shadow-pop-lg overflow-hidden group"
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className={`${mode.bg} p-4 border-b-4 border-black`}>
                <mode.icon className="w-10 h-10 text-black mx-auto" strokeWidth={3} />
              </div>
              <div className="p-6">
                <h3 className="font-display text-2xl md:text-3xl text-black uppercase tracking-wide mb-1">
                  {mode.title}
                </h3>
                <p className="font-body font-bold text-sm text-pop-red mb-3">
                  {mode.subtitle}
                </p>
                <p className="font-body font-bold text-sm md:text-base text-black/70">
                  {mode.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 如何使用区块
function HowItWorksSection() {
  const steps = [
    { num: '01', title: '输入文本', desc: '粘贴外语文本、翻译母语文本、或让 AI 生成', color: '#FF006E' },
    { num: '02', title: '浏览字典', desc: '查看分句翻译和词汇释义，随时查阅任意单词', color: '#FFD700' },
    { num: '03', title: '阶段一', desc: '单词选择、句子翻译、听力理解', color: '#00BFFF' },
    { num: '04', title: '阶段二', desc: '遮蔽填空、翻译重组', color: '#39FF14' },
    { num: '05', title: '错题回顾', desc: '答错的题自动收集，强化练习直到掌握', color: '#BF5FFF' },
  ]

  return (
    <section id="how" className="py-16 md:py-24 px-4 md:px-8 bg-white border-y-4 border-black relative">
      <HalftoneOverlay color="#00BFFF" opacity={0.03} />

      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="font-display text-sm md:text-base bg-pop-yellow text-black px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest">
            使用流程
          </span>
          <h2 className="font-display text-3xl md:text-5xl mt-6 text-black">
            五步<span className="text-pop-red">搞定</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* 连接线 */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-black -translate-x-1/2" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className={`flex items-center gap-6 mb-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
              initial={{ x: i % 2 === 0 ? -30 : 30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                <div className="bg-pop-cream border-4 border-black p-5 shadow-pop inline-block">
                  <span className="font-display text-3xl md:text-4xl" style={{ color: step.color }}>
                    {step.num}
                  </span>
                  <h3 className="font-display text-xl md:text-2xl text-black uppercase tracking-wide mt-1">
                    {step.title}
                  </h3>
                  <p className="font-body font-bold text-sm md:text-base text-black/70 mt-2">
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* 中心圆点 */}
              <div
                className="hidden md:flex w-12 h-12 border-4 border-black items-center justify-center shrink-0 shadow-pop-sm"
                style={{ backgroundColor: step.color }}
              >
                <span className="font-display text-black text-sm">{step.num}</span>
              </div>

              <div className="flex-1 hidden md:block" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA 区块
function CTASection({ onStartLearning }) {
  return (
    <section className="py-16 md:py-24 px-4 md:px-8 bg-pop-red border-y-4 border-black relative overflow-hidden">
      <HalftoneOverlay color="#FFF" opacity={0.05} />

      {/* 装饰 */}
      <div className="absolute top-8 left-8 opacity-10">
        <FrogMascot size={80} />
      </div>
      <div className="absolute bottom-8 right-8 opacity-10">
        <FrogMascot size={60} />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl text-white mb-6">
            准备好了吗？
          </h2>
          <p className="font-body font-bold text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            只需一个 API Key，无需数据库，纯 LLM 能力驱动一切。<br />
            任何语言 → 任何语言，你的素材你做主。
          </p>
          <button
            onClick={onStartLearning}
            className="bg-pop-yellow text-black font-display text-2xl md:text-3xl px-10 py-5 border-4 border-black shadow-pop-xl hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all tracking-wider"
          >
            立即开始 <Zap className="inline w-7 h-7 ml-2" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}

// 学习体系区块
function LearningSystemSection() {
  return (
    <section className="py-16 md:py-24 px-4 md:px-8 bg-pop-cream relative">
      <HalftoneOverlay color="#FFD700" opacity={0.03} />

      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="font-display text-sm md:text-base bg-pop-green text-black px-4 py-2 border-4 border-black shadow-pop-sm tracking-widest">
            学习体系
          </span>
          <h2 className="font-display text-3xl md:text-5xl mt-6 text-black">
            两阶段 + 错题回顾
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 阶段一 */}
          <motion.div
            className="bg-white border-4 border-black shadow-pop-lg p-6 md:p-8"
            initial={{ x: -30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="bg-pop-blue border-4 border-black px-4 py-2 inline-block shadow-pop-sm mb-4">
              <span className="font-display text-xl text-black tracking-wider">阶段一 · 词汇认知</span>
            </div>
            <div className="space-y-3 mt-4">
              {[
                { icon: BookOpen, text: '单词选择 — 四选一，看单词选释义', color: '#FF006E' },
                { icon: Languages, text: '句子翻译 — 看源语言句子，拼出翻译', color: '#00BFFF' },
                { icon: Volume2, text: '听力理解 — 听句子，拼出听到的内容', color: '#FFD700' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center border-2 border-black shrink-0" style={{ backgroundColor: item.color }}>
                    <item.icon className="w-4 h-4 text-black" strokeWidth={3} />
                  </div>
                  <span className="font-body font-bold text-sm md:text-base text-black/80">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 阶段二 */}
          <motion.div
            className="bg-white border-4 border-black shadow-pop-lg p-6 md:p-8"
            initial={{ x: 30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="bg-pop-yellow border-4 border-black px-4 py-2 inline-block shadow-pop-sm mb-4">
              <span className="font-display text-xl text-black tracking-wider">阶段二 · 综合训练</span>
            </div>
            <div className="space-y-3 mt-4">
              {[
                { icon: PenTool, text: '遮蔽填空 — 句子中挖空关键词，选择正确答案', color: '#39FF14' },
                { icon: Brain, text: '翻译重组 — 看母语翻译，还原原句', color: '#BF5FFF' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center border-2 border-black shrink-0" style={{ backgroundColor: item.color }}>
                    <item.icon className="w-4 h-4 text-black" strokeWidth={3} />
                  </div>
                  <span className="font-body font-bold text-sm md:text-base text-black/80">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-pop-pink/30 border-4 border-black p-4 shadow-pop-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-black" strokeWidth={3} />
                <span className="font-display text-lg text-black tracking-wider">错题回顾</span>
              </div>
              <p className="font-body font-bold text-sm text-black/70 mt-2">
                答错的题自动收集，强化练习直到掌握为止
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// 页脚
function Footer() {
  return (
    <footer className="bg-black text-white py-12 md:py-16 px-4 md:px-8 border-t-4 border-black">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FrogMascot size={40} />
              <span className="font-display text-2xl tracking-wider">呱邻国</span>
            </div>
            <p className="font-body font-bold text-sm text-white/50">
              完全由 AI 驱动。输入 API，实现语言自由。
            </p>
          </div>
          <div>
            <h4 className="font-display text-lg mb-4 tracking-wider">技术栈</h4>
            <ul className="space-y-2 font-body font-bold text-sm text-white/50">
              <li>React 18 · Vite · TailwindCSS</li>
              <li>FastAPI · OpenAI 兼容 LLM API</li>
              <li>Web Speech API · Framer Motion</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-lg mb-4 tracking-wider">开源协议</h4>
            <p className="font-body font-bold text-sm text-white/50">
              GNU GPL v3 License
            </p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t-2 border-white/20 text-center">
          <p className="font-body font-bold text-sm text-white/30">
            © 2024 呱邻国 Lesslingo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

// 主应用
function App() {
  const [showApp, setShowApp] = useState(false)

  const handleStartLearning = () => {
    setShowApp(true)
  }

  const handleBackToHome = () => {
    setShowApp(false)
  }

  if (showApp) {
    // 跳转到学习应用 - 使用默认前端
    window.location.href = 'http://localhost:5173'
    return (
      <div className="min-h-screen bg-pop-yellow flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-pop-lg p-8 text-center">
          <FrogMascot size={80} className="mx-auto mb-4" />
          <p className="font-display text-2xl text-black">正在跳转到学习页面...</p>
          <button
            onClick={handleBackToHome}
            className="mt-4 bg-pop-red text-white font-display px-6 py-3 border-4 border-black shadow-pop hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all tracking-wider"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pop-cream font-body">
      <Navbar onStartLearning={handleStartLearning} />
      <HeroSection onStartLearning={handleStartLearning} />
      <FeaturesSection />
      <CompareSection />
      <ModesSection />
      <LearningSystemSection />
      <HowItWorksSection />
      <CTASection onStartLearning={handleStartLearning} />
      <Footer />
    </div>
  )
}

export default App
