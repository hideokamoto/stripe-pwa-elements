import { i18n } from './utils/i18n';

// The repo has no @types/node; Jest runs specs as CommonJS, so `require` and `__dirname` exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;

const { readFileSync, readdirSync, existsSync } = require('fs');
const { join } = require('path');

const repoRoot = join(__dirname, '..');
const skillName = 'stripe-pwa-elements';
const skillDir = join(repoRoot, 'plugins', 'stripe-pwa-elements', 'skills', skillName);
const read = (path: string): string => readFileSync(path, 'utf8');

const skillMd = read(join(skillDir, 'SKILL.md'));
const frontmatter = skillMd.split(/^---$/m)[1];

/**
 * Components that exist in src/ but are deliberately left out of the skill.
 * Remove an entry once the component ships in a published release and the skill documents it.
 */
const tagsNotInSkill: Record<string, string> = {
  'stripe-payment-sheet': 'not in a published npm release yet',
};

/** Language names the skill uses for each i18n resource key */
const languageNames: Record<string, string> = {
  'en': 'English',
  'ja': 'Japanese',
  'pt-BR': 'Portuguese',
};

const componentTags = (): string[] =>
  readdirSync(join(repoRoot, 'src', 'components'))
    .map((dir: string) => join(repoRoot, 'src', 'components', dir, `${dir}.tsx`))
    .filter((file: string) => existsSync(file))
    .map((file: string) => read(file).match(/tag:\s*'([^']+)'/)?.[1])
    .filter((tag: string | undefined): tag is string => Boolean(tag))
    .sort();

const tagsIn = (text: string): string[] => [...new Set((text.match(/<stripe-[a-z-]+>/g) ?? []).map(tag => tag.slice(1, -1)))].sort();

describe('Agent Skill stays in step with the library', () => {
  it('names the skill after its directory', () => {
    expect(frontmatter).toMatch(new RegExp(`^name: ${skillName}$`, 'm'));
  });

  it('loads the CDN bundle that package.json `unpkg` points at', () => {
    const pkg = JSON.parse(read(join(repoRoot, 'package.json')));
    const cdnUrls = skillMd.match(/https:\/\/unpkg\.com\/[^"'\s)]+/g) ?? [];

    expect(cdnUrls.length).toBeGreaterThan(0);
    cdnUrls.forEach(url => expect(url).toBe(`https://unpkg.com/stripe-pwa-elements/${pkg.unpkg}`));
  });

  it('lists every component tag in the description and the component table', () => {
    const expected = componentTags().filter(tag => !(tag in tagsNotInSkill));

    expect(tagsIn(frontmatter)).toEqual(expected);
    expect(tagsIn(skillMd.split(/^## Choose the right component$/m)[1].split(/^## /m)[0])).toEqual(expected);
  });

  it('is a single SKILL.md, so every way of fetching it gets the whole skill', () => {
    expect(readdirSync(skillDir)).toEqual(['SKILL.md']);
    expect(skillMd).not.toMatch(/\]\((?!https?:)[^)]+\)/);
  });

  it('only leaves out components that still exist', () => {
    const tags = componentTags();

    Object.keys(tagsNotInSkill).forEach(tag => expect(tags).toContain(tag));
  });

  it('names the languages that i18n ships translations for', () => {
    const keys = Object.keys(i18n.options.resources ?? {}).sort();

    expect(keys).toEqual(Object.keys(languageNames).sort());
    expect(skillMd).toContain(`i18n (${keys.map(key => languageNames[key]).join(', ')})`);
  });
});
