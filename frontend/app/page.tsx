import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight, Menu, MoveUpRight, Play, Sparkles } from "lucide-react";

const services = [
  {
    number: "01",
    title: "Web products",
    description: "Conversion-ready websites and platforms that make your next big idea feel inevitable.",
    accent: "coral",
  },
  {
    number: "02",
    title: "App experiences",
    description: "Human-centered mobile products built to earn a place in your customers' daily rhythm.",
    accent: "blue",
  },
  {
    number: "03",
    title: "Digital systems",
    description: "Thoughtful strategy, design, and engineering working together from first sketch to scale.",
    accent: "lime",
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link href="/" className="brand-lockup" aria-label="Billora Technologies home">
          <Image src="/logo.png" alt="" width={48} height={48} priority className="brand-logo" style={{ height: "auto" }} />
          <span>
            <strong>Billora</strong>
            <small>Technologies</small>
          </span>
        </Link>

        <div className="nav-links">
          <a href="#work">What we make</a>
          <a href="#approach">Our approach</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="nav-actions">
          <Link href="/login" className="nav-login">Log in</Link>
          <Link href="/register" className="button button-small button-light">Start a project <ArrowUpRight size={15} /></Link>
        </div>
        <button className="mobile-menu" type="button" aria-label="Open menu"><Menu size={22} /></button>
      </nav>

      <section className="hero-section">
        <div className="hero-copy reveal-up">
          <div className="eyebrow"><span className="eyebrow-dot" /> Billora Technologies / Digital studio</div>
          <h1>Make the <em>next</em> thing matter.</h1>
          <p className="hero-description">We turn ambitious ideas into clear, useful digital products that move businesses and people forward.</p>
          <div className="hero-actions">
            <Link href="#contact" className="button button-primary">Build with us <ArrowUpRight size={17} /></Link>
            <a href="#work" className="text-link"><span className="play-icon"><Play size={12} fill="currentColor" /></span> See what we do</a>
          </div>
        </div>

        <div className="hero-visual reveal-float" aria-label="Billora Technologies product design showcase">
          <div className="visual-grid" />
          <div className="signal signal-one" />
          <div className="signal signal-two" />
          <div className="visual-card visual-card-main">
            <div className="visual-card-top"><span>BT / 2026</span><span className="status"><span /> live system</span></div>
            <div className="visual-total"><small>Momentum index</small><strong>84.6</strong><span>+18.4%</span></div>
            <div className="chart-line"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="chart-labels"><span>JAN</span><span>APR</span><span>JUL</span><span>OCT</span></div>
          </div>
          <div className="visual-card visual-card-float"><Sparkles size={16} /><span>Ideas, in motion.</span><MoveUpRight size={15} /></div>
          <div className="visual-note">Designed for<br /><strong>what&apos;s next</strong></div>
        </div>

        <div className="hero-bottom reveal-up delay-two">
          <span>Trusted by people building the future</span>
          <div className="client-words"><span>Founders</span><span>Teams</span><span>Changemakers</span></div>
        </div>
      </section>

      <section className="manifesto-section" id="approach">
        <div className="section-kicker">The Billora point of view <span>✳</span></div>
        <div className="manifesto-grid">
          <h2>Good technology should feel a little like <span>magic.</span></h2>
          <div>
            <p>Not because it is mysterious. Because the hard parts have been handled with care. We bring clarity to complex problems and craft digital experiences that feel simple, distinct, and built to last.</p>
            <Link href="#contact" className="underlined-link">Bring us a good problem <ChevronRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="services-section" id="work">
        <div className="section-heading"><div><div className="section-kicker">What we make</div><h2>Useful. Beautiful. <span>Built.</span></h2></div><span className="section-index">/ 03 services</span></div>
        <div className="service-list">
          {services.map((service) => (
            <article className={`service-row service-${service.accent}`} key={service.number}>
              <span className="service-number">{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <ArrowUpRight className="service-arrow" size={22} />
            </article>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-mark"><Image src="/logo.png" alt="Billora Technologies" width={86} height={86} style={{ height: "auto" }} /></div>
        <div><div className="section-kicker">Have a good problem?</div><h2>Let&apos;s make <em>something</em> useful.</h2><p>Tell us where you want to go. We&apos;ll help you find the clearest way there.</p></div>
        <Link href="/register" className="button button-dark">Start a conversation <ArrowUpRight size={17} /></Link>
      </section>

      <footer className="landing-footer"><span>© 2026 Billora Technologies</span><span>Web / App / Product</span><span className="footer-right">Made with intention <Check size={15} /></span></footer>
    </main>
  );
}
