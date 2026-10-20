import type { APIRoute, GetStaticPaths } from 'astro';
import { agentSkills, markdownHeaders } from '../../../../lib/agent-skills';

export const prerender = true;

/** Each skill's SKILL.md, at the URL the discovery index points to */
export const getStaticPaths = (() => agentSkills.map(({ name, skillMd }) => ({ params: { name }, props: { skillMd } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => new Response(props.skillMd, { headers: markdownHeaders });
