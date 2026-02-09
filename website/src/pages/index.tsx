import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const features = [
  {
    title: 'Provider-Agnostic',
    description:
      'Swap between Claude Code, Codex, and Aider with a single field change. Add custom providers in minutes.',
  },
  {
    title: 'Workspace Isolation',
    description:
      'Every execution runs in a temporary directory. Input files are seeded, output files are diffed, and the workspace is destroyed after completion.',
  },
  {
    title: 'Production-Ready',
    description:
      'Semaphore-based concurrency control, bounded queues, per-request cancellation, and graceful shutdown with configurable drain timeouts.',
  },
];

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className={clsx('hero__title', styles.heroTitle)}>
          {siteConfig.title}
        </Heading>
        <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Get Started
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            to="/docs/api"
          >
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {features.map(({ title, description }) => (
            <div key={title} className={clsx('col col--4', styles.featureCard)}>
              <Heading as="h3" className={styles.featureTitle}>
                {title}
              </Heading>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomepageQuickStart() {
  return (
    <section className="container" style={{ paddingBottom: '3rem' }}>
      <Heading as="h2" style={{ textAlign: 'center' }}>
        Quick Start
      </Heading>
      <div className={styles.codeBlock}>
        <code>
          <pre style={{ margin: 0 }}>
{`npm install
export CODEGATE_AUTH_TOKEN="your-secret-token"
npm run build && npm start

# Execute a prompt
curl http://localhost:3000/api/execute \\
  -H "Authorization: Bearer your-secret-token" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Hello world", "provider": "claude-code"}'`}
          </pre>
        </code>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Home" description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <HomepageQuickStart />
      </main>
    </Layout>
  );
}
