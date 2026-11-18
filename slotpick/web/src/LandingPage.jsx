const platforms = ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho'];

const steps = [
  {
    number: '01',
    title: 'Sign in securely',
    description: 'View deliveries linked to your customer account or use your private delivery link.',
  },
  {
    number: '02',
    title: 'View Available Slots',
    description: 'See the delivery windows available when your package reaches the hub.',
  },
  {
    number: '03',
    title: 'Choose Delivery Time',
    description: 'Pick a time that works for you. Your day stays yours.',
  },
  {
    number: '04',
    title: 'Receive Status Updates',
    description: 'Know when your delivery is on its way and when it arrives.',
  },
];

const features = [
  {
    icon: '01',
    title: 'Slot Booking',
    description: 'Choose a convenient delivery window instead of waiting around.',
  },
  {
    icon: '02',
    title: 'Delivery Tracking',
    description: 'Follow your delivery from the local hub right to your door.',
  },
  {
    icon: '03',
    title: 'Agent Updates',
    description: 'Get timely progress updates from the people handling your delivery.',
  },
  {
    icon: '04',
    title: 'Notifications',
    description: 'Stay in the loop with updates when your delivery status changes.',
  },
];

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

export default function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="#/" aria-label="SlotPick home">
          <span className="landing-brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>slotpick</span>
        </a>

        <nav className="landing-nav-links" aria-label="Main navigation">
          <button type="button" onClick={() => scrollToSection('how-it-works')}>
            How it works
          </button>
          <button type="button" onClick={() => scrollToSection('features')}>
            Features
          </button>
        </nav>

        <div className="landing-header-actions">
          <button className="landing-login-link" type="button" onClick={() => onNavigate('/login')}>
            Login
          </button>
          <button className="landing-button landing-button-small" type="button" onClick={() => onNavigate('/account')}>
            Get Started
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow"><span /> DELIVERY, ON YOUR TIME</p>
            <h1>Never wait all day for a delivery <em>again.</em></h1>
            <p className="landing-hero-description">
              Choose your delivery time slot when your package reaches the local hub.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-button" type="button" onClick={() => onNavigate('/account')}>
                Get Started <span aria-hidden="true">→</span>
              </button>
              <button className="landing-button-quiet" type="button" onClick={() => onNavigate('/login')}>
                Login
              </button>
            </div>
            <p className="landing-hero-note">
              A little more certainty. A lot more time for you.
            </p>
          </div>

          <div className="landing-visual" aria-label="Example delivery slot selection" role="img">
            <div className="landing-visual-orbit landing-visual-orbit-one" />
            <div className="landing-visual-orbit landing-visual-orbit-two" />
            <div className="landing-route-label landing-route-label-top">
              <span className="landing-live-dot" /> PACKAGE AT LOCAL HUB
            </div>
            <div className="landing-route-line" aria-hidden="true">
              <span className="landing-route-stop landing-route-stop-hub" />
              <span className="landing-route-stop landing-route-stop-home" />
              <span className="landing-route-van">S</span>
            </div>
            <div className="landing-delivery-card">
              <div className="landing-delivery-card-top">
                <span className="landing-card-icon" aria-hidden="true">S</span>
                <span className="landing-card-status">READY TO SCHEDULE</span>
              </div>
              <p className="landing-card-title">Your delivery, your time.</p>
              <p className="landing-card-subtitle">Choose a window that works for you.</p>
              <div className="landing-slot-preview">
                <span>Today</span>
                <strong>2:00 - 4:00 PM</strong>
                <span className="landing-slot-check" aria-label="Selected">✓</span>
              </div>
              <div className="landing-card-footer">
                <span className="landing-live-dot" /> Slot reserved for you
              </div>
            </div>
            <div className="landing-floating-note">
              <span className="landing-note-check">✓</span>
              <span><strong>You're all set</strong><small>No more waiting around</small></span>
            </div>
          </div>
        </section>

        <section className="landing-platforms" aria-labelledby="platforms-title">
          <p id="platforms-title">A better delivery day, whatever you shop</p>
          <div className="landing-platform-list">
            {platforms.map((platform) => (
              <span className={`landing-platform landing-platform-${platform.toLowerCase()}`} key={platform}>
                {platform}
              </span>
            ))}
          </div>
        </section>

        <section className="landing-process" id="how-it-works">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">SIMPLE FROM THE START</p>
            <h2>Four steps to a delivery that fits your day.</h2>
            <p>Take control of the last mile with a few quick steps.</p>
          </div>
          <div className="landing-step-grid">
            {steps.map((step) => (
              <article className="landing-step" key={step.number}>
                <span className="landing-step-number">{step.number}</span>
                <span className="landing-step-connector" aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">THE DETAILS, HANDLED</p>
            <h2>Less guessing. More getting on with your day.</h2>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature) => (
              <article className="landing-feature" key={feature.title}>
                <span className="landing-feature-icon" aria-hidden="true">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <p className="landing-eyebrow">YOUR TIME IS YOURS</p>
            <h2>Make room for a better delivery day.</h2>
          </div>
          <button className="landing-button landing-button-light" type="button" onClick={() => onNavigate('/account')}>
            Get Started <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="#/" aria-label="SlotPick home">
          <span className="landing-brand-mark" aria-hidden="true"><span /></span>
          <span>slotpick</span>
        </a>
        <p>More time for what matters.</p>
        <button type="button" onClick={() => onNavigate('/login')}>Login</button>
      </footer>
    </div>
  );
}
