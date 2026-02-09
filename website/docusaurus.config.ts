import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'codegate',
  tagline: 'Provider-agnostic HTTP gateway to coding agent CLIs',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://becs-n-bytes.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/codegate/',

  // GitHub pages deployment config.
  organizationName: 'becs-n-bytes', // Usually your GitHub org/user name.
  projectName: 'codegate', // Usually your repo name.
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/your-org/codegate/tree/main/website/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'codegate',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/your-org/codegate',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/intro' },
            { label: 'API Reference', to: '/docs/api' },
            { label: 'Providers', to: '/docs/providers' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/your-org/codegate' },
            { label: 'Configuration', to: '/docs/configuration' },
            { label: 'Deployment', to: '/docs/deployment' },
          ],
        },
      ],
      copyright: `Copyright \u00a9 ${new Date().getFullYear()} codegate contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'docker', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
