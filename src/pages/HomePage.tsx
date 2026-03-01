import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext";

const FEATURES = [
  {
    icon: "🍽️",
    title: "Personalized Meal Plans",
    desc: "7-day plans tailored to your health conditions, dietary needs, and cultural food preferences — backed by clinical nutrition guidelines.",
  },
  {
    icon: "🛒",
    title: "Smart Shopping Lists",
    desc: "Auto-generated weekly lists organized into 4 supermarket sections. Tap items as you shop, no syncing needed.",
  },
  {
    icon: "💬",
    title: "AI Nutrition Chat",
    desc: "Ask anything about your plan. Get personalized, educated answers 24/7 — always grounded in your specific health profile.",
  },
];

const STEPS = [
  { num: "01", title: "Build your health profile", desc: "Share your conditions, goals, dietary type, and food culture in a quick 4-step wizard." },
  { num: "02", title: "Get your weekly plan", desc: "Our AI nutritionist generates a medically-informed 7-day meal plan in under 30 seconds." },
  { num: "03", title: "Shop and eat smarter", desc: "Use your auto-generated list at the store, then understand every meal choice with education tips." },
];

const HomePage = () => {
  const { session } = useSession();

  return (
    <div className="lp">
      {/* ── Navigation ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <span className="lp-logo-icon">🌿</span>
            <span className="lp-logo-text">HealBites</span>
          </div>
          <div className="lp-nav-actions">
            {session ? (
              <Link to="/dashboard" className="lp-nav-cta">
                Go to dashboard →
              </Link>
            ) : (
              <>
                <Link to="/auth/sign-in" className="lp-nav-link">
                  Sign in
                </Link>
                <Link to="/auth/sign-up" className="lp-nav-cta">
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-orb lp-orb-3" />
        </div>
        <div className="lp-hero-inner">
          <span className="lp-eyebrow">Personalized nutrition for chronic care</span>
          <h1 className="lp-hero-title">
            Smarter Meals.<br />Healthier Lives.
          </h1>
          <p className="lp-hero-sub">
            HealBites builds your weekly meal plan around your health conditions,
            dietary restrictions, and food culture — then teaches you the{" "}
            <em className="lp-em">why</em> behind every bite.
          </p>
          <div className="lp-hero-actions">
            <Link to="/auth/sign-up" className="lp-btn-primary">
              Start for free →
            </Link>
            <Link to="/auth/sign-in" className="lp-btn-ghost">
              Sign in
            </Link>
          </div>
          <p className="lp-hero-note">No credit card required · Takes 3 minutes</p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features">
        <div className="lp-section-inner">
          <span className="lp-section-label">What you get</span>
          <h2 className="lp-section-title">Nutrition, simplified.</h2>
          <div className="lp-feature-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <span className="lp-feature-icon">{f.icon}</span>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-how">
        <div className="lp-section-inner">
          <span className="lp-section-label lp-section-label-light">How it works</span>
          <h2 className="lp-section-title lp-section-title-light">
            From profile to plan in minutes.
          </h2>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div key={s.num} className="lp-step">
                <span className="lp-step-num">{s.num}</span>
                <div>
                  <h3 className="lp-step-title">{s.title}</h3>
                  <p className="lp-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Education principle ── */}
      <section className="lp-edu">
        <div className="lp-edu-inner">
          <div className="lp-edu-badge">🎓</div>
          <div>
            <h3 className="lp-edu-title">
              We don't just tell you <em className="lp-em">what</em> to eat.
            </h3>
            <p className="lp-edu-desc">
              Every meal recommendation includes a personalized clinical reason — a
              warm, friendly explanation of exactly why that food benefits{" "}
              <em className="lp-em">your</em> specific conditions and goals.
              Education is woven into every interaction.
            </p>
            <blockquote className="lp-edu-example">
              "Salmon is rich in omega-3 fatty acids, which help reduce inflammation
              and directly support your cholesterol management goal."
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── CTA bar ── */}
      <section className="lp-cta-bar">
        <div className="lp-cta-bar-inner">
          <h2 className="lp-cta-title">Ready to eat smarter?</h2>
          <p className="lp-cta-sub">
            Create your health profile in 4 steps. Your first plan is ready in
            under 30 seconds.
          </p>
          <Link to="/auth/sign-up" className="lp-btn-primary lp-btn-lg">
            Get started free →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-logo">
            <span className="lp-logo-icon">🌿</span>
            <span className="lp-logo-text">HealBites</span>
          </div>
          <p className="lp-footer-copy">
            © 2026 HealBites · Smarter Meals. Healthier Lives.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
