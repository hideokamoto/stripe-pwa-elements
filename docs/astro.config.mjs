// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import starlightLlmsTxt from 'starlight-llms-txt';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
	site: 'https://stripe-pwa-elements-docs.wp-kyoto.workers.dev',
	adapter: cloudflare({ prerenderEnvironment: 'node' }),
	integrations: [
		mermaid({
			autoTheme: true,
		}),
		starlight({
			plugins: [starlightLlmsTxt()],
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
