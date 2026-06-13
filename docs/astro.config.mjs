// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// Cloudflare Web Analytics beacon is injected only when PUBLIC_CF_ANALYTICS_TOKEN is set.
// Set this environment variable at build/deploy time — never hard-code a real token.
const cfAnalyticsToken = process.env.PUBLIC_CF_ANALYTICS_TOKEN;
const analyticsHeadEntries = cfAnalyticsToken
	? [
			{
				tag: 'script',
				attrs: {
					defer: true,
					src: 'https://static.cloudflareinsights.com/beacon.min.js',
					'data-cf-beacon': JSON.stringify({ token: cfAnalyticsToken }),
				},
			},
		]
	: [];

// https://astro.build/config
export default defineConfig({
	integrations: [
		mermaid({
			autoTheme: true,
		}),
		starlight({
			title: 'stripe-pwa-elements',
			defaultLocale: 'root',
			locales: {
				root: { label: '日本語', lang: 'ja' },
				en: { label: 'English' },
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/wpkyoto/stripe-pwa-elements' }],
			head: analyticsHeadEntries,
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
