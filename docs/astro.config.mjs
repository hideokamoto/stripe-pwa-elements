// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import starlightLlmsTxt from 'starlight-llms-txt';

// https://astro.build/config
export default defineConfig({
	site: 'https://stripe-pwa-elements-docs.workers.dev',
	integrations: [
		mermaid({
			autoTheme: true,
		}),
		starlight({
			plugins: [starlightLlmsTxt()],
			title: 'stripe-pwa-elements',
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
					autogenerate: { directory: 'guides' },
				},
				{
					label: 'Components',
					translations: { ja: 'コンポーネント' },
					autogenerate: { directory: 'components' },
				},
			],
		}),
	],
});
