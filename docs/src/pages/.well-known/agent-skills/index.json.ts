import type { APIRoute } from 'astro';
import { agentSkills, sha256Digest, skillBasePath } from '../../../lib/agent-skills';

export const prerender = true;

/**
 * Discovery index from the Agent Skills Discovery RFC (draft v0.2.0):
 * https://github.com/cloudflare/agent-skills-discovery-rfc
 */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
        skills: agentSkills.map(({ name, description, skillMd }) => ({
          name,
          type: 'skill-md',
          description,
          url: `${skillBasePath(name)}SKILL.md`,
          digest: sha256Digest(skillMd),
        })),
      },
      null,
      2
    ) + '\n',
    { headers: { 'Content-Type': 'application/json' } }
  );
