import type { APIRoute } from 'astro';
import { getAgentSkill, markdownHeaders } from '../lib/agent-skills';

export const prerender = true;

/** The library's Agent Skill at a short, guessable URL */
export const GET: APIRoute = () => new Response(getAgentSkill('stripe-pwa-elements').skillMd, { headers: markdownHeaders });
