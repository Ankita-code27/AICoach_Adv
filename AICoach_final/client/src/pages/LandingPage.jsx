import { Link } from 'react-router-dom';
import { Sparkles, Target, MessageSquareText, TrendingUp, ShieldCheck, ArrowRight, Mic, Wand2 } from 'lucide-react';
import PageBackground from '../layouts/PageBackground.jsx';

const features = [
  {
    icon: Target,
    title: 'Tailored to your role',
    description: 'Questions are generated for the exact role and difficulty you choose — from entry-level to advanced technical rounds.',
  },
  {
    icon: MessageSquareText,
    title: 'Instant AI feedback',
    description: 'Every answer is scored out of 10 with concrete strengths, gaps, and a sample answer you can learn from.',
  },
  {
    icon: Mic,
    title: 'Type or speak your answers',
    description: 'Answer in text, or switch to voice mode in supported browsers — questions read aloud, your speech transcribed into the same answer box.',
  },
  {
    icon: Wand2,
    title: 'Adaptive sessions',
    description: 'In adaptive mode, the next question is chosen live based on how you scored — probing deeper or moving on, within a bounded session length.',
  },
  {
    icon: TrendingUp,
    title: 'Practice that compounds',
    description: 'Work through full mock interviews question by question, at your own pace, as many times as you need.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    description: 'Your account and interview history are yours — protected by Firebase authentication and per-user data access rules.',
  },
];

const steps = [
  { title: 'Pick your setup', description: 'Choose a job role, difficulty, and how many questions you want to practice.' },
  { title: 'Answer each question', description: 'Respond in your own words, just like a real interview conversation.' },
  { title: 'Get scored feedback', description: 'See your score, strengths, weaknesses, and a stronger sample answer instantly.' },
];

function LandingPage() {
  return (
    <div className="landing-page">
      <PageBackground />

      <header className="landing-nav">
        <span className="brand-mark">
          <span className="brand-icon" aria-hidden="true"><Sparkles size={17} strokeWidth={2.25} /></span>
          <span className="brand-label">AI Interview Coach</span>
        </span>
        <nav className="landing-nav-actions">
          <Link to="/login" className="btn btn-ghost btn-auto">Sign in</Link>
          <Link to="/register" className="btn btn-primary btn-auto">Get started free</Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={13} /> AI-powered interview practice</p>
            <h1>Walk into your next interview already knowing how you'll do.</h1>
            <p className="hero-subtitle">
              Practice real interview questions for your target role, get scored by AI in real time, and see
              exactly what to improve before it counts.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-auto">
                Start practicing free <ArrowRight size={17} />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-auto">I already have an account</Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <HeroVisual />
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading centered">
            <h2>Everything you need to prepare with confidence</h2>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, description }) => (
              <article className="card feature-card" key={title}>
                <span className="stat-icon" aria-hidden="true"><Icon size={20} /></span>
                <h3>{title}</h3>
                <p className="text-muted">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading centered">
            <h2>How it works</h2>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <article className="card step-card" key={step.title}>
                <span className="step-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p className="text-muted">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-preview-section">
          <div className="landing-section-heading">
            <p className="eyebrow"><Sparkles size={13} /> See it in action</p>
            <h2>A live session, scored as you go</h2>
            <p className="text-muted">
              Each answer is graded the moment you submit it — overall score, strengths, gaps, and a stronger
              sample answer, all in one place.
            </p>
          </div>
          <div className="card preview-card">
            <div className="preview-window">
              <div className="preview-window-bar">
                <span className="preview-dot" /><span className="preview-dot" /><span className="preview-dot" />
              </div>
              <div className="preview-window-body">
                <div className="preview-panel">
                  <span className="preview-line tint" style={{ width: '70%' }} />
                  <span className="preview-line" />
                  <span className="preview-line short" />
                  <span className="preview-line" style={{ marginTop: 'var(--space-3)' }} />
                  <span className="preview-line short" />
                </div>
                <div className="preview-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span className="preview-score-ring">8.5</span>
                    <span className="preview-line short" style={{ margin: 0 }} />
                  </div>
                  <span className="preview-line" />
                  <span className="preview-line" />
                  <span className="preview-line short" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-cta card">
          <h2>Ready to see where you stand?</h2>
          <p className="text-muted">Create a free account and start your first mock interview in under a minute.</p>
          <Link to="/register" className="btn btn-primary btn-auto">Create free account</Link>
        </section>
      </main>

      <footer className="landing-footer">
        <span>AI Interview Coach</span>
        <span className="text-subtle">Built with React, Node.js, Firebase, and Groq.</span>
      </footer>
    </div>
  );
}

/**
 * Original abstract "AI core" visual: concentric glowing rings, orbiting
 * nodes and connecting circuit lines. Decorative only — not derived from
 * any reference image.
 */
function HeroVisual() {
  return (
    <svg viewBox="0 0 420 420" width="100%" height="100%" style={{ maxWidth: '26rem' }}>
      <defs>
        <radialGradient id="hv-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.9" />
          <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hv-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--secondary)" />
        </linearGradient>
      </defs>

      <circle cx="210" cy="210" r="150" fill="url(#hv-core)" />

      <circle cx="210" cy="210" r="130" fill="none" stroke="url(#hv-ring)" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="210" cy="210" r="95" fill="none" stroke="url(#hv-ring)" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="210" cy="210" r="60" fill="none" stroke="url(#hv-ring)" strokeOpacity="0.7" strokeWidth="1.5" />

      <line x1="210" y1="80" x2="210" y2="150" stroke="var(--primary)" strokeOpacity="0.4" strokeWidth="1" />
      <line x1="210" y1="270" x2="210" y2="340" stroke="var(--secondary)" strokeOpacity="0.4" strokeWidth="1" />
      <line x1="80" y1="210" x2="150" y2="210" stroke="var(--primary)" strokeOpacity="0.4" strokeWidth="1" />
      <line x1="270" y1="210" x2="340" y2="210" stroke="var(--secondary)" strokeOpacity="0.4" strokeWidth="1" />
      <line x1="115" y1="115" x2="160" y2="160" stroke="var(--primary)" strokeOpacity="0.3" strokeWidth="1" />
      <line x1="305" y1="305" x2="260" y2="260" stroke="var(--secondary)" strokeOpacity="0.3" strokeWidth="1" />

      <circle cx="210" cy="80" r="5" fill="var(--foreground)" />
      <circle cx="210" cy="340" r="5" fill="var(--secondary)" />
      <circle cx="80" cy="210" r="4" fill="var(--primary)" />
      <circle cx="340" cy="210" r="4" fill="var(--foreground)" />
      <circle cx="115" cy="115" r="3.5" fill="var(--secondary)" />
      <circle cx="305" cy="305" r="3.5" fill="var(--primary)" />

      <g transform="translate(210,210)">
        <circle r="34" fill="var(--background)" stroke="url(#hv-ring)" strokeWidth="1.5" />
        <path d="M -14 8 L -3 -12 L 8 -12 L 19 8 L 11 8 L 9 3 L -2 3 L -4 8 Z M 0.5 -4 L 3 1 L 4.5 -4 Z"
          fill="var(--foreground)" opacity="0.9" transform="scale(0.85)" />
      </g>
    </svg>
  );
}

export default LandingPage;
