import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Moon, Sun, Code2, Trophy, Bell, Bot, BarChart3, ShieldCheck,
  GitBranch, MapPin, FileDown, Zap, ChevronRight, CheckCircle2,
  Star, Menu, X, ArrowRight, Layers, Clock, MessageSquare, Award,
  Settings2, Cpu, Users, ChevronDown,
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────

function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const h = () => setY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return y
}

function FadeIn({
  children, delay = 0, className = '', direction = 'up',
}: {
  children: React.ReactNode; delay?: number; className?: string; direction?: 'up' | 'left' | 'right'
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const from = direction === 'left' ? { x: -32, opacity: 0 } : direction === 'right' ? { x: 32, opacity: 0 } : { y: 28, opacity: 0 }
  const to = { x: 0, y: 0, opacity: 1 }
  return (
    <motion.div ref={ref} initial={from} animate={inView ? to : {}}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }} className={className}>
      {children}
    </motion.div>
  )
}

// ─── data ─────────────────────────────────────────────────────────────────────

const FEATURES_LEFT = [
  {
    tag: 'Team Management',
    title: 'Form your team, your way',
    body: 'Create or join teams, send join requests, receive invitations, and manage membership — all before a single line of code is written. Leaders approve or reject requests in real time.',
    points: ['Create teams with size limits', 'Send & accept join requests', 'Invite users by search', 'Leader-controlled approvals'],
    // replace with your actual screenshot path when ready
    img: null,
    imgAlt: 'Team management dashboard screenshot',
  },
  {
    tag: 'Scoring & Rankings',
    title: 'Multi-round mentor scoring, live leaderboard',
    body: 'Admins define mentoring rounds with time windows. Mentors score only the teams assigned to their floor and room. Average scores across all rounds determine final rankings — updated instantly.',
    points: ['Time-windowed scoring rounds', 'Mentor-to-team assignment via venue', 'Comment + score per submission', 'Live rankings for all roles'],
    img: null,
    imgAlt: 'Live rankings leaderboard screenshot',
  },
  {
    tag: 'Project Submissions',
    title: 'GitHub-verified submissions with a controlled window',
    body: "Every submission URL is checked against the GitHub API before it's accepted. Broken repos, private repos, or invalid URLs are rejected at the point of entry. Admins control when the window is open.",
    points: ['Live GitHub repo validation', 'Admin-controlled submission window', 'Tech stack captured per team', 'Update submissions while window is open'],
    img: null,
    imgAlt: 'Project submission form screenshot',
  },
]

const MINOR_FEATURES = [
  { icon: Bell, title: 'Real-Time Notifications', desc: 'Redis stream + Web Push. Team approvals, score events, and announcements delivered automatically.' },
  { icon: Bot, title: 'AI Chatbot', desc: 'Rule-based intent matching + OpenAI fallback. Full history logged per user.' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Registrations, team statuses, score averages per round, top tech stacks, teams per location.' },
  { icon: MapPin, title: 'Venue Management', desc: 'Floors, rooms, physical team locations. Rankings show floor and room numbers.' },
  { icon: FileDown, title: 'CSV / PDF Export', desc: 'Export users, teams, scores, submissions in one click. No third-party BI needed.' },
  { icon: MessageSquare, title: 'Support Tickets', desc: 'Participants raise tickets. Volunteers handle them. Admins oversee everything.' },
  { icon: Cpu, title: 'Mentor Recommendations', desc: 'AI-assisted mentor-to-team matching based on tech stack similarity.' },
  { icon: Layers, title: 'Announcements', desc: 'Role-filtered posts. Admins publish, all roles read. Notifications fire on post.' },
  { icon: Clock, title: 'Submission Window', desc: 'Admin toggles the submission period. Participants blocked outside the window.' },
  { icon: ShieldCheck, title: 'JWT Auth + Roles', desc: 'Access and refresh tokens. Four roles with non-overlapping permissions enforced at every layer.' },
  { icon: GitBranch, title: 'Activity Logs', desc: 'Every important admin action is timestamped and logged for audit purposes.' },
  { icon: Settings2, title: 'System Settings', desc: 'Admins configure hackathon name, dates, contact info, and platform-wide toggles.' },
]

const TWEETS = [
  { handle: '@rahuldev_builds', name: 'Rahul Sharma', body: 'Finally ran a hackathon without losing track of team registrations or mentor assignments. HackMate handled everything — the live rankings board alone saved us 2 hours of manual work.', stars: 5 },
  { handle: '@piyatech', name: 'Priya Nair', body: 'The GitHub validation on submission was a lifesaver. No more teams submitting broken links at the last minute. It rejects invalid repos on the spot.', stars: 5 },
  { handle: '@mentorvikas', name: 'Vikas Mehta', body: "As a mentor I could see exactly which teams I needed to visit based on floor and room. Scored them round by round with comments. The scoring history view is clean and fast.", stars: 5 },
  { handle: '@adminpreet', name: 'Preethi R.', body: "The admin analytics dashboard gave us registration curves, tech stack distributions, and score averages per round without exporting anything. That's what I needed.", stars: 5 },
  { handle: '@hackathon_lead', name: 'Arjun Kapoor', body: 'The AI chatbot handled 80% of participant questions during the event. The team genuinely didn\'t need to answer the same "how do I submit?" question 40 times.', stars: 5 },
  { handle: '@volunteeranaya', name: 'Anaya Singh', body: 'Support ticket assignment worked seamlessly. Participants raised issues, I got notified, resolved them. No spreadsheet, no Slack DMs — just the platform.', stars: 5 },
]

const STATS = [
  { value: '8', label: 'Microservices' },
  { value: '4', label: 'User Roles' },
  { value: '50+', label: 'API Endpoints' },
  { value: '100%', label: 'Open Source Ready' },
]

const ROLES = [
  { label: 'Participants', color: 'from-violet-500 to-purple-600', icon: Code2, desc: 'Register, form teams, submit projects, track your mentoring scores and live rankings.' },
  { label: 'Mentors', color: 'from-blue-500 to-cyan-600', icon: Award, desc: 'Get floor/room assignments, score teams across rounds, view scoring history and comments.' },
  { label: 'Volunteers', color: 'from-emerald-500 to-teal-600', icon: Users, desc: 'Handle support tickets, monitor teams and mentors, view rankings and announcements.' },
  { label: 'Admins', color: 'from-orange-500 to-rose-600', icon: Settings2, desc: 'Full control — users, venue, rounds, submissions, announcements, analytics, exports.' },
]

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const y = useScrollY()
  const [open, setOpen] = useState(false)
  const scrolled = y > 24

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/85 dark:bg-[#0d0d14]/90 backdrop-blur-md border-b border-gray-200/60 dark:border-white/8 shadow-sm' : ''
    }`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-gray-900 dark:text-white">HackMate</span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-6">
          {(['Features', 'Roles', 'Why HackMate'] as const).map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`}
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              {l}
            </a>
          ))}
        </nav>

        {/* CTA row */}
        <div className="flex items-center gap-2">
          <button onClick={() => setDark(!dark)} aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <Link to="/login" className="hidden md:inline-flex text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 px-3 py-2 transition-colors">
            Sign in
          </Link>
          <Link to="/register" className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow hover:shadow-violet-500/30 transition-all">
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300" aria-label="Toggle menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-[#0d0d14] border-t border-gray-100 dark:border-white/8 px-5 py-4 flex flex-col gap-3">
            {['Features', 'Roles', 'Why HackMate'].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} onClick={() => setOpen(false)}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 py-1">{l}</a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-white/8 mt-1">
              <Link to="/login" onClick={() => setOpen(false)} className="flex-1 text-center py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium">Sign in</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="flex-1 text-center py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold">Register</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-5 overflow-hidden">
      {/* BG blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-violet-600/25 via-purple-500/12 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[400px] bg-gradient-to-tl from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-[-5%] w-[400px] h-[300px] bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-3xl" />
        {/* dot grid */}
        <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #7c3aed 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Pill badge */}
      <motion.a href="#features"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/35 border border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-7 hover:bg-violet-200 dark:hover:bg-violet-900/55 transition-colors">
        <span className="inline-block px-1.5 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold leading-none">NEW</span>
        AI Chatbot + Mentor Recommendations
        <ChevronRight className="w-3 h-3" />
      </motion.a>

      {/* Headline */}
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}
        className="text-5xl sm:text-6xl md:text-[72px] font-extrabold leading-[1.08] tracking-tight text-center text-gray-900 dark:text-white max-w-4xl">
        The platform for <em className="not-italic bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">hackathons that actually work</em>
      </motion.h1>

      {/* Sub */}
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
        className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl text-center leading-relaxed">
        Team formation, GitHub-verified submissions, multi-round mentor scoring, real-time rankings,
        AI assistance, and event analytics — all wired together in one microservice platform.
      </motion.p>

      {/* CTAs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28 }}
        className="mt-9 flex flex-col sm:flex-row gap-3.5 items-center">
        <Link to="/register" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[15px] shadow-lg hover:shadow-violet-500/35 transition-all">
          Get started free <ArrowRight className="w-4 h-4" />
        </Link>
        <a href="#features" className="inline-flex items-center gap-2 text-[15px] font-medium text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors px-2">
          <ChevronDown className="w-4 h-4" /> See all features
        </a>
      </motion.div>

      {/* Meta pills */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="mt-7 flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-500">
           <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Microservice architecture</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> JWT secured</span>
        <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-violet-500" /> Redis push notifications</span>
      </motion.div>

      {/* Browser mockup */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-14 w-full max-w-5xl relative">
        {/* Floating stat cards */}
        <div className="absolute -top-5 -left-4 sm:-left-8 z-10 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-none">Submission accepted</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">Team #42 · GitHub ✓</div>
          </div>
        </div>
        <div className="absolute -bottom-5 -right-4 sm:-right-8 z-10 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-none">Live rankings updated</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">Rank #1 · Avg 9.4 / 10</div>
          </div>
        </div>

        {/* Browser chrome */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl shadow-violet-500/10">
          <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3 flex items-center gap-2 border-b border-gray-200 dark:border-white/8">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-3 bg-white dark:bg-gray-800 rounded-md px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
              hackmate.dulify.in / admin / rankings
            </div>
          </div>
          {/* placeholder — swap with real screenshot */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-[#0d0d14] aspect-[16/9] flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Code2 className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-600 font-medium">Dashboard screenshot — add your own</p>
            <p className="text-xs text-gray-300 dark:text-gray-700">Replace this placeholder in the Hero component</p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

function StatsStrip() {
  return (
    <div className="border-y border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/[0.02] py-8">
      <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="text-3xl font-black text-gray-900 dark:text-white">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Feature alternating rows ─────────────────────────────────────────────────

function FeatureRow({ feat, idx }: { feat: typeof FEATURES_LEFT[0]; idx: number }) {
  const isEven = idx % 2 === 0
  return (
    <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 lg:gap-16 items-center py-16 lg:py-24`}>
      {/* Text side */}
      <FadeIn direction={isEven ? 'left' : 'right'} className="flex-1 max-w-lg">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-4">
          {feat.tag}
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-5">
          {feat.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
          {feat.body}
        </p>
        <ul className="space-y-2.5">
          {feat.points.map((pt) => (
            <li key={pt} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
              {pt}
            </li>
          ))}
        </ul>
      </FadeIn>

      {/* Image / placeholder side */}
      <FadeIn direction={isEven ? 'right' : 'left'} delay={0.1} className="flex-1 w-full max-w-xl">
        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-xl shadow-violet-500/5">
          <div className="bg-gray-100 dark:bg-gray-900 px-3 py-2.5 flex items-center gap-1.5 border-b border-gray-200 dark:border-white/8">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <div className="ml-2 flex-1 bg-white dark:bg-gray-800 rounded px-2 py-0.5 text-[10px] text-gray-400 font-mono">
              hackmate.dulify.in
            </div>
          </div>
          {feat.img ? (
            <img src={feat.img} alt={feat.imgAlt} className="w-full object-cover" />
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-[#0d0d14] aspect-[4/3] flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Code2 className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-600">Screenshot placeholder — {feat.tag}</p>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="py-8 px-5">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-3">What's built in</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Every feature ships with real API endpoints
          </h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            No mockups. No coming soon labels. Everything below is live and wired to a production backend.
          </p>
        </FadeIn>

        {FEATURES_LEFT.map((feat, i) => <FeatureRow key={feat.tag} feat={feat} idx={i} />)}
      </div>
    </section>
  )
}

// ─── Minor features grid ──────────────────────────────────────────────────────

function MinorFeaturesGrid() {
  return (
    <section className="py-20 px-5 bg-gray-50/70 dark:bg-white/[0.015]">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-3">Everything else</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            The full feature set
          </h2>
        </FadeIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MINOR_FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={(i % 6) * 0.06}>
              <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-white/8 p-5 flex gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                  <f.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Roles ────────────────────────────────────────────────────────────────────

function RolesSection() {
  return (
    <section id="roles" className="py-20 px-5">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-3">Four roles, one platform</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            Built for everyone at the hackathon
          </h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Each role logs in to a separate dashboard with exactly the tools they need. No clutter, no permission leaks.
          </p>
        </FadeIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLES.map((r, i) => (
            <FadeIn key={r.label} delay={i * 0.09}>
              <div className="group relative rounded-2xl border border-gray-100 dark:border-white/8 bg-white dark:bg-gray-900/60 p-6 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
                <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${r.color}`} />
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-4 shadow-md`}>
                  <r.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{r.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{r.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Tweets / social proof ────────────────────────────────────────────────────

function TweetsSection() {
  // Split into 3 columns for masonry-like layout
  const cols: (typeof TWEETS)[] = [[], [], []]
  TWEETS.forEach((t, i) => cols[i % 3].push(t))

  return (
    <section className="py-20 px-5 bg-gray-50/70 dark:bg-white/[0.015]">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-3">What people say</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            From organizers, mentors &amp; participants
          </h2>
        </FadeIn>
        <div className="hidden lg:grid grid-cols-3 gap-4 items-start">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-4">
              {col.map((t, ti) => (
                <FadeIn key={t.handle} delay={ci * 0.07 + ti * 0.05}>
                  <TweetCard tweet={t} />
                </FadeIn>
              ))}
            </div>
          ))}
        </div>
        {/* Mobile: single col */}
        <div className="lg:hidden grid sm:grid-cols-2 gap-4">
          {TWEETS.map((t, i) => (
            <FadeIn key={t.handle} delay={i * 0.05}>
              <TweetCard tweet={t} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function TweetCard({ tweet }: { tweet: typeof TWEETS[0] }) {
  return (
    <div className="bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-100 dark:border-white/8 p-5 hover:shadow-lg transition-shadow">
      {/* Stars */}
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: tweet.stars }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      {/* Body */}
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        &ldquo;{tweet.body}&rdquo;
      </p>
      {/* Author */}
      <div className="flex items-center gap-3">
        {/* avatar placeholder */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">{tweet.name[0]}</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{tweet.name}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tweet.handle}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Why HackMate / USP ───────────────────────────────────────────────────────

const USPS = [
  { icon: ShieldCheck, title: 'Hardened role separation', desc: 'Four roles, non-overlapping permissions enforced at the API layer — not just the UI. Middleware validates every token on every request.' },
  { icon: Zap, title: 'Zero single point of failure', desc: '8 independent microservices. A crashed chatbot doesn\'t take down scoring or auth. Services communicate via API gateway with timeout handling.' },
  { icon: Bot, title: 'GPT assistant out of the box', desc: 'Rule-based intent matching handles frequent questions. OpenAI handles the rest. Full conversation history stored per user.' },
  { icon: GitBranch, title: 'Live GitHub validation', desc: 'Submissions call the GitHub API before acceptance. Private, deleted, or invalid repos are rejected immediately — no manual checking.' },
  { icon: Bell, title: 'Event-driven push notifications', desc: 'Redis streams carry events between services. Web Push delivers them to browsers. Participants stay informed even when off-platform.' },
  { icon: Cpu, title: 'ML-assisted mentor matching', desc: 'Tech stack similarity scoring between mentors and teams reduces assignment effort. Admin can override any suggestion.' },
  { icon: BarChart3, title: 'Analytics without extra tools', desc: 'No Tableau, no Metabase. Registration curves, score averages by round, tech distributions, and location-based team counts live in the dashboard.' },
  { icon: MapPin, title: 'Physical venue awareness', desc: 'Floors and rooms are first-class entities. Mentor assignments and rankings both reference physical locations, not just abstract IDs.' },
]

function USPSection() {
  return (
    <section id="why-hackmate" className="py-20 px-5">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-3">Why HackMate</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            Honest differentiators
          </h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Things other hackathon tools don't do, or bolt on as afterthoughts.
          </p>
        </FadeIn>
        <div className="grid sm:grid-cols-2 gap-5">
          {USPS.map((u, i) => (
            <FadeIn key={u.title} delay={(i % 4) * 0.07}>
              <div className="flex gap-4 p-5 rounded-2xl border border-gray-100 dark:border-white/8 bg-white dark:bg-gray-900/60 hover:shadow-lg transition-all group">
                <div className="w-10 h-10 rounded-xl bg-violet-100/80 dark:bg-violet-900/25 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 transition-colors">
                  <u.icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">{u.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{u.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA banner ───────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="py-20 px-5">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-10 sm:p-16 text-center shadow-2xl shadow-violet-500/25">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white/90 text-xs font-semibold mb-6">
                <CheckCircle2 className="w-3.5 h-3.5" /> Free to use — no credit card
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
                Ready to run a better hackathon?
              </h2>
              <p className="text-white/65 max-w-md mx-auto mb-8">
                Sign up, invite your team, and run your first event. Everything you need is already built.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-violet-700 font-bold text-sm hover:bg-gray-50 transition-colors shadow-lg">
                  Create your account <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-colors">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-gray-100 dark:border-white/8 py-10 px-5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
            <Code2 className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-800 dark:text-white">HackMate</span>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Auth · Teams · Scoring · Submissions · Notifications · Analytics · AI Chatbot
        </p>
        <div className="flex gap-5 text-xs text-gray-400">
          <Link to="/login" className="hover:text-violet-500 transition-colors">Sign in</Link>
          <Link to="/register" className="hover:text-violet-500 transition-colors">Register</Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('hm:theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) { root.classList.add('dark'); localStorage.setItem('hm:theme', 'dark') }
    else { root.classList.remove('dark'); localStorage.setItem('hm:theme', 'light') }
  }, [dark])

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0d14] text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar dark={dark} setDark={setDark} />
      <main>
        <Hero />
        <StatsStrip />
        <FeaturesSection />
        <MinorFeaturesGrid />
        <RolesSection />
        <TweetsSection />
        <USPSection />
        <CTABanner />
      </main>
      <Footer />
    </div>
  )
}
