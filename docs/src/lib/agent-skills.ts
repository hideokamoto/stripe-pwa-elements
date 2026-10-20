import { createHash } from 'node:crypto';
import { parse } from 'yaml';

/**
 * Agent Skills shipped in this repository, read at build time from the plugin directory so the site never keeps its own copy.
 * Keys look like `../../../plugins/stripe-pwa-elements/skills/<name>/SKILL.md`.
 */
const skillFiles = import.meta.glob<string>('../../../plugins/stripe-pwa-elements/skills/*/SKILL.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface AgentSkill {
  name: string;
  description: string;
  /** Raw SKILL.md contents */
  skillMd: string;
}

/** Directory each skill is served under, per the Agent Skills Discovery RFC convention */
export const skillBasePath = (name: string) => `/.well-known/agent-skills/${name}/`;

/** `sha256:<hex>` over the UTF-8 bytes of the content */
export const sha256Digest = (content: string) => `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;

export const markdownHeaders = { 'Content-Type': 'text/markdown; charset=utf-8' };

const parseFrontmatter = (skillMd: string): { name: string; description: string } => {
  const match = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    throw new Error('SKILL.md has no YAML frontmatter');
  }
  return parse(match[1]);
};

export const agentSkills: AgentSkill[] = Object.entries(skillFiles).map(([path, skillMd]) => {
  const dir = path.split('/').slice(-2)[0];
  const { name, description } = parseFrontmatter(skillMd);
  if (name !== dir) {
    throw new Error(`Skill name "${name}" must match its directory "${dir}"`);
  }
  return { name, description, skillMd };
});

export const getAgentSkill = (name: string): AgentSkill => {
  const skill = agentSkills.find((s) => s.name === name);
  if (!skill) {
    throw new Error(`Unknown Agent Skill: ${name}`);
  }
  return skill;
};
