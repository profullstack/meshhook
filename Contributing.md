# Contributing to MeshHook

Thank you for your interest in contributing to MeshHook! This guide will help you get started with contributing to our webhook-first workflow engine.

## About MeshHook

MeshHook is an MIT-licensed, webhook-first workflow engine with a visual builder and Temporal-like durability via event sourcing on Postgres. We mesh your webhooks and orchestrate everything with simplicity, durability, and security.

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or later) or **Bun**
- **pnpm** (recommended package manager)
- **Git**
- **Supabase CLI** (`pnpm install -g supabase`)
- **Docker** (for local Supabase)

### Setting Up Your Development Environment

**1. Fork and clone**
```bash
git clone https://github.com/YOUR_USERNAME/meshhook.git
cd meshhook
```

**2. Install dependencies**
```bash
pnpm install
```

**3. Setup environment**
```bash
pnpm run setup
```
Select "Local Development" when prompted.

**4. Start Supabase locally**
```bash
pnpx supabase start
```

**5. Run database migrations**
```bash
pnpm run db:migrate
```

**6. Start the orchestrator**
```bash
pnpm run start
```

Your local instance should now be running at `http://localhost:8080`

### Tech Stack

- **UI/API**: SvelteKit (Svelte 5)
- **Database/Queues/Realtime/Storage**: Supabase (Postgres)
- **Workers**: Node.js or Bun (stateless)
- **Queue**: pg-boss or pgmq (Postgres-native)
- **Transforms**: JMESPath
- **Single Service**: All components run on port 8080

---

## How to Contribute

### Contribution Workflow

**1. Create a feature branch**
```bash
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/bug-description
```

**2. Make your changes**
- Write clean, readable code
- Follow our style guide
- Add tests if applicable
- Update documentation if needed

**3. Test your changes**
```bash
pnpm run lint
pnpm run start
pnpm run db:migrate  # if you changed the database
```

**4. Commit your changes**
```bash
git add .
git commit -m "Brief description of your changes"
```

Good commit messages:
- ✅ `Add webhook retry logic`
- ✅ `Fix event sourcing race condition`
- ✅ `Update JMESPath transform examples`

**5. Push to your fork**
```bash
git push origin feature/your-feature-name
```

**6. Create a Pull Request**

Go to your fork on GitHub and click "New Pull Request". Fill out the PR template with:
- Description of changes
- Related issue number (if applicable)
- Testing performed
- Screenshots (for UI changes)

**7. Address review feedback**
- Respond to comments promptly
- Make requested changes
- Push updates to the same branch

### What to Contribute

We welcome contributions in many forms:

- **Bug fixes** - Found a bug? Please fix it!
- **New features** - Have an idea? Open an issue first to discuss
- **Documentation** - Improve guides, add examples, fix typos
- **Tests** - Add missing test coverage
- **Performance improvements** - Make MeshHook faster
- **Webhook integrations** - Add new webhook sources or destinations
- **JMESPath transforms** - Create reusable transform templates
- **UI/UX enhancements** - Improve the visual builder

Looking for your first contribution? Check issues labeled `good first issue` or `hacktoberfest`.

---

## 📋 Style Guide

### JavaScript/TypeScript

- Use **TypeScript** for new code
- Use `const` and `let`, avoid `var`
- Prefer arrow functions for callbacks
- Use async/await over raw promises
- Name variables descriptively (avoid single letters except in loops)
- Add JSDoc comments for functions and complex logic

### Svelte 5

- Use **Svelte 5 runes** (`$state`, `$derived`, `$effect`)
- Keep components small and focused
- Use TypeScript in script blocks
- Follow reactive programming patterns
- Extract reusable logic into composables

### CSS

- Use **Tailwind CSS** utility classes when possible
- For custom styles, use component-scoped CSS
- Follow mobile-first responsive design
- Maintain consistent spacing using Tailwind's scale

### Database & Event Sourcing

- Use **Postgres-native** features whenever possible
- Follow event sourcing patterns for workflow state
- Use pg-boss or pgmq for queue operations
- Leverage Supabase Realtime for live updates
- Write efficient queries, considering partitioning strategy

### JMESPath Transforms

- Keep transforms simple and readable
- Add comments explaining complex expressions
- Test transforms with sample data
- Document expected input/output structures

---

## Community Standards

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. We expect all contributors to:

- **Be respectful** - Treat everyone with kindness and empathy
- **Be collaborative** - Work together, share knowledge, help others
- **Be patient** - Remember that everyone is learning
- **Be constructive** - Provide helpful feedback, focus on solutions
- **Be inclusive** - Welcome people of all backgrounds and skill levels

### Communication

- **GitHub Issues** - For bug reports and feature requests
- **Pull Request comments** - For code-specific discussions
- **Project discussions** - For general questions and ideas

### Reporting Issues

When reporting a bug, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, Supabase version)
- Screenshots or error logs if applicable
- Relevant workflow configuration (if applicable)

---

## 🔒 Security

- **Never commit sensitive information** (API keys, passwords, tokens, Supabase credentials)
- Use environment variables for all configuration
- `.env.staging` and `.env.production` are **not committed** to the repository
- Report security vulnerabilities privately to the maintainers
- Follow security best practices in webhook handling and data transformations

---

## ✅ Testing

Before submitting a PR:
- Test locally with `pnpm run start`
- Verify migrations work: `pnpm run db:migrate`
- Test webhook intake and workflow execution
- Check for linting errors: `pnpm run lint`
- Verify that existing functionality still works
- Test with both local Supabase and remote instances (if possible)

---

## 📚 Documentation

When adding new features:
- Update relevant documentation in `./docs/`
- Add code comments for complex logic
- Update PlantUML diagrams if architecture changes
- Add examples for new webhook integrations or transforms
- Update the README if necessary

---

## Useful Commands

### Setup & Configuration
```bash
pnpm run setup              # Interactive environment configuration
pnpm run db:migrate         # Run database migrations (auto-detects environment)
```

### Development
```bash
pnpm run start              # Start the orchestrator worker
pnpm mh --help              # CLI help
```

### Testing & Linting
```bash
pnpm test                   # Run tests (if available)
pnpm run lint               # Check for linting errors
```

### Supabase
```bash
pnpx supabase start         # Start local Supabase
pnpx supabase stop          # Stop local Supabase
pnpx supabase status        # Check Supabase status
```

---

## Environment Files

- `.env.local` - Local development (committed to repo with safe defaults)
- `.env.staging` - Staging environment (**not committed**)
- `.env.production` - Production environment (**not committed**)
- `.env` - Symlink to active environment (created by setup script)

**Never commit `.env.staging` or `.env.production`!**

---

## Architecture References

Before making architectural changes, review:
- `./docs/Architecture.md` - System architecture overview
- `./docs/Event-Partitioning.md` - Event sourcing and partitioning strategy
- `./docs/PRD.md` - Product requirements and design decisions
- `./docs/diagrams/*.puml` - Visual architecture diagrams

---

## Questions?

If you're unsure about anything:
- Check existing documentation in `./docs/`
- Review similar implementations in the codebase
- Open a new issue with the "question" label
- Reach out to maintainers through project communication channels

---

## Recognition

All contributors are valued and will be recognized in our project documentation. Thank you for helping make MeshHook better!

---

**Happy Contributing! 🎉**

*MeshHook — Mesh your webhooks. Orchestrate everything.*

This guide is maintained by the MeshHook community. If you find areas for improvement, please submit a PR!