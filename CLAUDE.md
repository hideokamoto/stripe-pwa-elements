# CLAUDE.md - AI Assistant Guide for stripe-pwa-elements

This document provides comprehensive guidance for AI assistants working with the stripe-pwa-elements codebase.

## Project Overview

**stripe-pwa-elements** is a web component library that provides Stripe payment elements for Progressive Web Apps. It uses Stencil.js (version 4.38+) to build framework-agnostic web components that can be used across any web platform.

- **Repository**: https://github.com/wpkyoto/stripe-pwa-elements
- **License**: MIT
- **Version**: 3.2.0
- **Main Technology**: Stencil.js 4.x (web components framework)
- **Primary Dependencies**: @stripe/stripe-js ^8.6.0, i18next for internationalization, ionicons

## Repository Structure

```text
stripe-pwa-elements/
├── .github/                    # GitHub configuration
│   ├── workflows/
│   │   └── ci.yml             # CI/CD pipeline (lint, type-check, tests, build)
│   ├── CODE_OF_CONDUCT.md
│   └── CONTRIBUTING.md         # Contribution guidelines with commit conventions
├── docs/                       # Astro/Starlight documentation site
├── example/                    # Example HTML files demonstrating usage
│   ├── index.html
│   ├── example2.html
│   ├── example3.html          # Payment Element
│   ├── example4.html          # Link Authentication
│   ├── address-example.html   # Address Element
│   └── example-express-checkout.html  # Express Checkout
├── src/                        # Source code
│   ├── components/            # Web components (9 components)
│   │   ├── stripe-address-element/        # Address collection form
│   │   ├── stripe-card-element/           # Card Element component (card number, expiry, CVC)
│   │   ├── stripe-card-element-modal/     # Combined card element with modal
│   │   ├── stripe-currency-selector/      # Currency selector for Adaptive Pricing
│   │   ├── stripe-express-checkout-element/ # Express Checkout (Apple Pay, Google Pay, etc.)
│   │   ├── stripe-link-authentication-element/ # Email + Stripe Link authentication
│   │   ├── stripe-modal/                  # Modal wrapper component
│   │   ├── stripe-payment-element/        # Unified Payment Element
│   │   └── stripe-payment-request-button/ # Payment Request API button (Beta)
│   │       Each component has: *.tsx, *.scss, readme.md (auto-generated), test/
│   ├── services/              # Service layer (dependency injection)
│   │   ├── interfaces.ts      # IStripeService + element manager interfaces
│   │   ├── stripe-service.ts  # StripeServiceClass: Stripe.js init, Elements/Checkout state
│   │   ├── factory.ts         # ServiceFactory: DI wiring, default serviceFactory singleton
│   │   ├── card-element-manager.ts
│   │   ├── payment-element-manager.ts
│   │   ├── address-element-manager.ts
│   │   ├── link-authentication-element-manager.ts
│   │   ├── currency-selector-element-manager.ts
│   │   ├── express-checkout-element-manager.ts
│   │   └── *.spec.ts          # Unit tests for each manager
│   ├── utils/                 # Utility functions
│   │   ├── element-finder.ts  # DOM element lookup helpers
│   │   ├── error.ts           # StripeAPIError and error handling utilities
│   │   ├── i18n.ts            # Internationalization setup (i18next)
│   │   ├── platform.ts        # Platform detection utilities
│   │   ├── test-setup.ts      # Jest test environment setup
│   │   └── utils.ts           # General utilities (checkPlatform, etc.)
│   ├── style/                 # Global styles
│   │   ├── rest.scss          # CSS reset styles
│   │   └── theme.scss         # Theme variables
│   ├── components.d.ts        # Generated TypeScript definitions
│   ├── index.ts               # Entry point
│   ├── index.html             # Development/demo page
│   └── interfaces.ts          # TypeScript interfaces and types
├── stencil.config.ts          # Stencil build configuration
├── stencil.config.unit.ts     # Stencil config for unit tests
├── stencil.config.component.ts # Stencil config for component tests
├── tsconfig.json              # TypeScript configuration
├── eslint.config.js           # ESLint flat config (replaces .eslintrc.json)
├── .prettierrc.json           # Prettier configuration
├── package.json               # Project dependencies and scripts
└── readme.md                  # Project README
```

## Core Components

### 1. stripe-card-element
Main component providing a Stripe card form using Stripe Card Elements.
- Location: `src/components/stripe-card-element/`
- Tag: `<stripe-card-element>`
- Features: Card number, expiry, CVC, optional ZIP code fields
- Supports both PaymentIntent and SetupIntent

### 2. stripe-payment-element
Unified payment form supporting multiple payment methods via Stripe's Payment Element.
- Location: `src/components/stripe-payment-element/`
- Tag: `<stripe-payment-element>`
- Supports PaymentIntent, SetupIntent, and Checkout Session modes

### 3. stripe-express-checkout-element
One-click payment methods (Apple Pay, Google Pay, Link, PayPal, Amazon Pay, etc.).
- Location: `src/components/stripe-express-checkout-element/`
- Tag: `<stripe-express-checkout-element>`

### 4. stripe-address-element
Address collection form with autocomplete, shipping or billing mode.
- Location: `src/components/stripe-address-element/`
- Tag: `<stripe-address-element>`

### 5. stripe-link-authentication-element
Email collection with Stripe Link one-click checkout authentication.
- Location: `src/components/stripe-link-authentication-element/`
- Tag: `<stripe-link-authentication-element>`

### 6. stripe-currency-selector
Currency selection for Stripe Adaptive Pricing.
- Location: `src/components/stripe-currency-selector/`
- Tag: `<stripe-currency-selector>`

### 7. stripe-modal
Simple modal wrapper for payment components. Uses shadow DOM (`shadow: true`).
- Location: `src/components/stripe-modal/`
- Tag: `<stripe-modal>`
- Provides modal functionality with open/close events

### 8. stripe-card-element-modal
Combined component integrating card element with modal.
- Location: `src/components/stripe-card-element-modal/`
- Tag: `<stripe-card-element-modal>`
- Combines stripe-card-element and stripe-modal

### 9. stripe-payment-request-button (Beta)
Payment Request API button component (Apple Pay / Google Pay).
- Location: `src/components/stripe-payment-request-button/`
- Tag: `<stripe-payment-request-button>`
- Status: Beta

## Development Workflows

### Environment Requirements
- Node.js >= 18.x (CI tests against Node.js 20.x and 22.x)
- pnpm
- Package manager: pnpm (package.json `packageManager`: pnpm@10.33.0)

### Setup
```bash
pnpm install          # Install dependencies
pnpm start            # Start dev server with watch mode
pnpm run build        # Production build
pnpm test             # Run unit tests
pnpm run lint         # Lint TypeScript/TSX files
pnpm run format       # Format code with Prettier
pnpm run generate     # Generate new Stencil component
```

### Build Process
- Build tool: Stencil CLI
- Output targets:
  - `dist/` - Standard distribution with ESM loader
  - `dist-custom-elements/` - Custom elements bundle
  - `docs-readme` - Auto-generated README files for components
  - `www/` - Development server output
- Build command generates documentation automatically

### Testing
- Test framework: Jest + Puppeteer
- Test location: `src/components/*/test/` and `src/services/*.spec.ts` and `src/utils/*.spec.ts`
- Test commands:
  - `pnpm test` - Run all spec tests
  - `pnpm run test:unit` - Run unit tests (services/utils) via `stencil.config.unit.ts`
  - `pnpm run test:component` - Run component tests via `stencil.config.component.ts`
  - `pnpm run test:e2e` - Run E2E tests
  - `pnpm run test.watch` - Watch mode for all tests
- Tests include snapshots (stored in `__snapshots__/` directories)
- Test environment configured in `src/utils/test-setup.ts`

### CI/CD Pipeline
- Platform: GitHub Actions
- Workflow file: `.github/workflows/ci.yml`
- Triggers: On push and pull_request
- Jobs:
  1. **lint** — Node 20.x: `pnpm run lint` + `pnpm audit --audit-level=moderate --prod`
  2. **type-check** — Node 20.x: `pnpm exec tsc --noEmit`
  3. **test** (matrix: 20.x, 22.x; needs lint+type-check): `pnpm run test:unit -- --coverage` + `pnpm run test:component`
  4. **build** (matrix: 20.x, 22.x; needs lint+type-check): `pnpm run build`

### Publishing
- Uses `np` package for releases
- Command: `pnpm run release`
- Pre-publish: Automatically runs build via `prepublishOnly` script

## Code Conventions

### TypeScript/JavaScript
- **Target**: ES2017
- **Module**: ESNext
- **JSX Factory**: `h` (Stencil's JSX pragma)
- **Decorators**: Enabled (required for Stencil)
- **Strict Options**:
  - `noUnusedLocals`: true
  - `noUnusedParameters`: true
  - `allowUnreachableCode`: false

### Stencil Component Conventions
- **Component Structure**:
  ```tsx
  import { Component, Prop, State, Method, Event, Element, Watch, h } from '@stencil/core';

  @Component({
    tag: 'component-name',
    styleUrl: 'component-name.scss',
    shadow: false,  // Note: Shadow DOM is disabled for most components
  })
  export class ComponentName {
    @Element() el: HTMLElement;
    @Prop() propName: type;
    @State() stateName: type;
    @Method() async methodName() {}
    @Event() eventName: EventEmitter<type>;
    @Watch('propName') watchHandler() {}

    render() {
      return <div>...</div>;
    }
  }
  ```

- **Decorator Style** (enforced by ESLint):
  - `@Prop`, `@State`, `@Element`, `@Event`: inline style
  - `@Method`, `@Watch`, `@Listen`: multiline style

- **Method Visibility**:
  - Public methods (exposed API): Use `@Method()` decorator, must be async
  - Private methods: Prefix with private keyword
  - Component props must be public and readonly

### ESLint Rules
Configuration: `eslint.config.js` (ESLint flat config)
- Extends: `eslint:recommended`, `@typescript-eslint/recommended`, `@stencil-community/recommended`
- Key rules:
  - `@stencil-community/async-methods`: error - All @Method() must be async
  - `@stencil-community/ban-prefix`: Bans "stencil" and "stnl" prefixes
  - `@stencil-community/required-jsdoc`: error - JSDoc required
  - `padding-line-between-statements`: Enforces blank lines between blocks
  - `curly`: error - Always use curly braces
  - Explicit module boundary types: off
  - Non-null assertions: allowed

### Prettier Configuration
Configuration: `.prettierrc.json`
- **Print Width**: 180 characters (notably wide!)
- **Quotes**: Single quotes
- **Semi**: true (semicolons required)
- **Tab Width**: 2 spaces
- **Arrow Parens**: avoid
- **Trailing Comma**: all
- **Bracket Spacing**: true
- **JSX Brackets**: On next line (false)

### Styling
- **Preprocessor**: SCSS (via @stencil/sass plugin)
- **Shadow DOM**: Disabled (shadow: false)
- **Style Organization**:
  - Component styles: Co-located with component (`.scss` files)
  - Global styles: `src/style/` directory
  - CSS Reset: `src/style/rest.scss`
  - Theme variables: `src/style/theme.scss`

### File Naming
- Components: kebab-case (e.g., `stripe-payment-element.tsx`)
- Utilities: camelCase (e.g., `error.ts`, `i18n.ts`)
- Tests: `*.spec.ts` or `*.spec.tsx` in `test/` subdirectory (components) or alongside service files
- Styles: Match component name (e.g., `stripe-payment-element.scss`)

### State Management and Service Layer
The codebase uses a **services layer** with dependency injection rather than a per-component Stencil Store.

Architecture (`src/services/`):
- **`IStripeService`** (`interfaces.ts`) — core interface: initializes Stripe.js, manages `StripeElements` and `StripeCheckout` instances, tracks `StripeServiceState` (publishableKey, loadStripeStatus, stripe, elements, checkout)
- **`StripeServiceClass`** (`stripe-service.ts`) — concrete implementation of `IStripeService`; supports Payment Intent mode and Checkout Session mode
- **Element managers** — one per element type, each taking an injected `IStripeService`:
  - `CardElementManager` — manages card number, expiry, CVC elements
  - `PaymentElementManager` — manages the unified Payment Element (PaymentIntent + Checkout Session)
  - `AddressElementManager` — manages Address Element
  - `LinkAuthenticationElementManager` — manages Link Authentication Element
  - `CurrencySelectorElementManager` — manages Currency Selector Element
  - `ExpressCheckoutElementManager` — manages Express Checkout Element
- **`ServiceFactory`** (`factory.ts`) — creates all service/manager instances with proper DI; a default `serviceFactory` singleton is exported and used by components; can be replaced with mocks in tests

Each Stencil component creates its own `IStripeService` and element manager via `serviceFactory` in `connectedCallback`, keeping state per-component instance.

### Internationalization
- Library: i18next with browser language detector
- Configuration: `src/utils/i18n.ts`
- Recommended translatable strings documented in component props

### Type Definitions
- Shared types: `src/interfaces.ts`
- Component-specific types: Usually defined in component file or interfaces
- Stripe types: Imported from `@stripe/stripe-js`
- Key custom types:
  - `FormSubmitEvent`, `FormSubmitHandler` - Form submission
  - `StripeLoadedEvent`, `StripeDidLoadedHandler` - Stripe initialization
  - `ProgressStatus` - Activity states: '', 'loading', 'success', 'failure'
  - `IntentType` - 'setup' | 'payment'

## Git Workflow

### Commit Message Convention
Follows **Conventional Commits** specification (v1.0.0):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `BREAKING CHANGE`: Breaking change (major update)
- `feat`: New feature (minor update)
- `fix`: Bug fix (patch update)
- `style`: Code formatting (patch update)
- `refactor`: Code refactoring (patch update)
- `perf`: Performance improvement (patch update)
- `test`: Test updates (patch update)
- `docs`: Documentation updates (patch update)
- `chore`: Other changes (patch update)

**Examples**:
```bash
# New feature
feat: add new feature

Describe in details.

fix #42

# Bug fix
fix: `tryUpdateState` should be called before finished

Describe in details.

fix #42

# Breaking change
feat: Change default StoreGroup

BREAKING CHANGE: make `StoreGroup` as default store

fix #42
```

### Branching Strategy
- Fork the repository
- Create feature branches: `git checkout -b my-new-feature`
- Submit Pull Requests to main repository

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Make changes with conventional commits
4. Ensure tests pass (`pnpm test`)
5. Ensure build succeeds (`pnpm run build`)
6. Submit PR

### Keep internal references out of public artifacts

This is a public open-source repository. Issue tracking happens in a **private** Linear
workspace, and those references must never leak into anything pushed here.

**Never** include private issue-tracker URLs or identifiers in:

- Pull request titles or bodies
- Commit messages
- Branch names
- Code comments, docs, or any committed file

Concretely, do **not** write:

- Linear URLs such as `https://linear.app/<workspace>/issue/...`
- Linear issue keys such as `HID-123` (or any private tracker ID)
- The private workspace/organization name

If a task originates from a Linear issue, describe the *what* and *why* directly in the
PR/commit using plain language; do not link back to or name the private tracker. Internal
cross-referencing should stay inside Linear (e.g. paste the PR URL into the Linear issue),
not the other way around.

## Common Development Tasks

### Creating a New Component
```bash
pnpm run generate
# or
stencil generate
```
Follow Stencil prompts to scaffold a new component.

### Running Examples Locally
```bash
# Build and copy to example directory
pnpm run example:copy

# Serve examples
pnpm run example:serve
```

### Debugging
- Development server runs at default Stencil port (typically 3333)
- Use browser DevTools to debug web components
- Check `src/index.html` for development test page

## Important Notes for AI Assistants

### When Making Changes

1. **Always run tests** after code changes:
   ```bash
   pnpm test
   ```

2. **Lint before committing**:
   ```bash
   pnpm run lint
   ```

3. **Format code**:
   ```bash
   pnpm run format
   ```

4. **Build to verify**:
   ```bash
   pnpm run build
   ```

5. **Follow commit conventions**: Use conventional commits format

### Component Development Guidelines

1. **Shadow DOM is disabled** - Styles are not encapsulated
2. **All @Method() must be async** - Enforced by ESLint
3. **JSDoc is required** - Document all public APIs
4. **Props should be readonly** - Follow Stencil best practices
5. **Use the services layer for state** - Create services via `serviceFactory` in `connectedCallback`; see `src/services/` for the architecture
6. **Support internationalization** - Use i18next for user-facing strings
7. **Platform detection** - Use `src/utils/platform.ts` utilities

### Testing Guidelines

1. Unit tests should cover:
   - Component rendering
   - Prop changes
   - Event emissions
   - Public methods
   - State updates

2. Use snapshots for UI testing
3. Test files go in component's `test/` directory
4. Follow existing test patterns in the codebase

### Common Pitfalls to Avoid

1. **Don't use shadow: true** - Project uses light DOM (the only intentional exception is `stripe-modal`, which sets `shadow: true`)
2. **Don't skip semicolons** - Required by Prettier config
3. **Don't exceed 180 character line width** - Prettier will wrap
4. **Don't use stencil/stnl prefixes** - Banned by ESLint
5. **Don't forget to make public methods async** - Required by @stencil-community rules
6. **Don't commit without conventional commit format** - Will break release workflow
7. **Don't modify components.d.ts** - Auto-generated file
8. **Don't leak private tracker references** - No Linear URLs/issue keys (e.g. `HID-123`) in PR titles, bodies, commit messages, or branch names (see "Keep internal references out of public artifacts")

### Working with Stripe

1. **Never commit real API keys** - Use test keys (pk_test_*)
2. **Handle both PaymentIntent and SetupIntent** - Use intentType prop
3. **Stripe elements are lazy loaded** - Wait for stripeLoaded event
4. **Error handling** - Use StripeAPIError utility from `src/utils/error.ts`
5. **Test mode** - All examples and tests should use Stripe test mode

### Documentation

1. **Component READMEs are auto-generated** - Run `pnpm run build --docs`
2. **Update main README.md** - For major feature additions
3. **JSDoc comments** - Will appear in generated docs
4. **Example usage** - Add to `example/` directory if adding new features

## Migration Notes

### Recent Migration to Stencil 4
The project migrated from Stencil 3 to Stencil 4 (see commit 99a0f5c) and has since been updated to `@stencil/core@^4.38.3`.
Key changes from original migration:
- Updated build configuration
- CI actions updated
- Node.js minimum raised to 18.x; CI matrix tests on 20.x and 22.x

Be aware of Stencil 4 breaking changes when making updates.

## Resources

- [Stencil Documentation](https://stenciljs.com/docs/introduction)
- [Stripe.js Documentation](https://stripe.com/docs/js)
- [Conventional Commits](https://conventionalcommits.org/)
- [i18next Documentation](https://www.i18next.com/)

## Maintainers

- Hidetaka Okamoto (@hideokamoto) - [@hide__dev](https://twitter.com/hide__dev)
- Masaki Hirano (@contiki9) - [@maki_saki](https://twitter.com/maki_saki)
- Masahiko Sakakibara (@rdlabo) - [@rdlabo](https://twitter.com/rdlabo)

---

**Last Updated**: 2026-06-05
**Stencil Version**: 4.38.3
**Node Version (CI)**: 20.x / 22.x
