---
title: Use with AI coding agents
description: Give coding agents the correct way to use stripe-pwa-elements with the Agent Skill and llms.txt.
---

This repository ships an [Agent Skill](https://agentskills.io/specification) for coding agents.
It covers which component fits the job, how to pass the publishable key and client secret, the submit/confirm flow,
and safety rules such as asking the user before anything that changes their Stripe account.

## Install

Add it to a project with the [`skills`](https://www.npmjs.com/package/skills) CLI:

```bash
npx skills add hideokamoto/stripe-pwa-elements
```

In Claude Code you can also install it as a plugin:

```text
/plugin marketplace add hideokamoto/stripe-pwa-elements
/plugin install stripe-pwa-elements@stripe-pwa-elements
```

## Fetch it over HTTP

This site reads `plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md` from the repository at build time and serves it.

| URL | Contents |
| --- | --- |
| [`/skill.md`](/skill.md) | The skill (SKILL.md) |
| [`/.well-known/agent-skills/index.json`](/.well-known/agent-skills/index.json) | Index in the [Agent Skills Discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc) format (draft v0.2.0), with a SHA-256 digest per skill |
| [`/.well-known/agent-skills/stripe-pwa-elements/SKILL.md`](/.well-known/agent-skills/stripe-pwa-elements/SKILL.md) | The skill, with the `reference.md` and `examples.md` it links to in the same directory |

## llms.txt

The whole documentation is available as [`/llms.txt`](/llms.txt), [`/llms-full.txt`](/llms-full.txt) and [`/llms-small.txt`](/llms-small.txt).
`/llms.txt` also lists the skill URLs and the install commands.
Every page's `<head>` has `<link rel="describedby" href="/llms.txt">`, so `/llms.txt` can be found from any page.

## When you change a component

When you add, rename or remove a component, or change its props, events, methods or how it is loaded,
update the skill in the same pull request.
`src/agent-skill.unit.spec.ts` fails when the tag names, CDN path or i18n languages in the skill no longer match the code.
