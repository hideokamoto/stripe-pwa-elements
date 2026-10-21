// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import starlightLlmsTxt from 'starlight-llms-txt';
import cloudflare from '@astrojs/cloudflare';

const site = 'https://stripe-pwa-elements-docs.wp-kyoto.workers.dev';

// Served by src/pages/skill.md.ts and src/pages/.well-known/agent-skills/ from plugins/stripe-pwa-elements/skills/.
const llmsTxtDetails = `This site also serves the stripe-pwa-elements Agent Skill, which tells coding agents how to integrate the library: which component to pick, how to wire the publishable key and client secret, and the safety rules for changing a Stripe account.

- [SKILL.md](${site}/.well-known/agent-skills/stripe-pwa-elements/SKILL.md): the skill itself, also at ${site}/skill.md
- [Agent Skills discovery index](${site}/.well-known/agent-skills/index.json): lists the skills on this site with their SHA-256 digests

Install the skill into a project with \`npx skills add hideokamoto/stripe-pwa-elements\`. In Claude Code, run \`/plugin marketplace add hideokamoto/stripe-pwa-elements\` and then \`/plugin install stripe-pwa-elements@stripe-pwa-elements\`.`;

// https://astro.build/config
export default defineConfig({
	site,
	adapter: cloudflare({ prerenderEnvironment: 'node' }),
	integrations: [
		mermaid({
			autoTheme: true,
		}),
		starlight({
			plugins: [starlightLlmsTxt({ details: llmsTxtDetails })],
			title: 'stripe-pwa-elements',
			// llms.txt v2: rel="describedby" points every page at the llms.txt that covers it.
			head: [{ tag: 'link', attrs: { rel: 'describedby', href: '/llms.txt' } }],
			defaultLocale: 'root',
			locales: {
				root: { label: '日本語', lang: 'ja' },
				en: { label: 'English' },
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/wpkyoto/stripe-pwa-elements' }],
			sidebar: [
				{
					label: 'Getting Started',
					translations: { ja: 'はじめに' },
					items: [{ label: 'Overview', slug: '', translations: { ja: '概要' } }],
				},
				{
					label: 'Guides',
					translations: { ja: 'ガイド' },
					items: [{ autogenerate: { directory: 'guides' } }],
				},
				{
					label: 'Components',
					translations: { ja: 'コンポーネント' },
					items: [{ autogenerate: { directory: 'components' } }],
				},
			],
		}),
	],
});
