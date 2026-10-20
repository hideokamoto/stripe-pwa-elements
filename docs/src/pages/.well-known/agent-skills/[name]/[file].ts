import type { APIRoute, GetStaticPaths } from 'astro';
import { agentSkills, markdownHeaders } from '../../../../lib/agent-skills';

export const prerender = true;

/** SKILL.md plus the files it links to, so its relative links resolve next to it */
export const getStaticPaths = (() =>
  agentSkills.flatMap(({ name, files }) =>
    Object.entries(files).map(([file, content]) => ({ params: { name, file }, props: { content } }))
  )) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => new Response(props.content, { headers: markdownHeaders });
