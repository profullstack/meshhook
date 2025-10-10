# MeshHook Scripts

This directory contains utility scripts for the MeshHook project.

## generate-issue-prds.mjs

Generates comprehensive Product Requirements Documents (PRDs) for GitHub issues with optional AI enhancement and diagram generation.

### Features

- **Template-based PRD Generation**: Creates structured PRDs from GitHub issues using project context
- **AI-Enhanced PRDs**: Uses GPT-4 to generate detailed, context-aware PRDs (optional)
- **PlantUML Diagrams**: Automatically generates architecture diagrams for each issue (optional)
- **PNG Export**: Converts PlantUML diagrams to PNG images (requires PlantUML installed)
- **Batch Processing**: Processes all open issues in the repository
- **GitHub Integration**: Updates issue bodies with PRD links and content
- **Label Management**: Can add labels to issues during processing

### Prerequisites

1. **GitHub CLI**: Install from https://cli.github.com/
   ```bash
   # Authenticate with GitHub
   gh auth login
   ```

2. **OpenAI API Key** (for --use-ai mode):
   ```bash
   # Add to your .env file
   OPENAI_API_KEY=your-api-key-here
   ```

3. **PlantUML** (optional, for PNG generation):
   ```bash
   # macOS
   brew install plantuml
   
   # Ubuntu/Debian
   apt-get install plantuml
   
   # Or download from https://plantuml.com/download
   ```

### Usage

```bash
# Basic usage (template-based PRDs)
node scripts/generate-issue-prds.mjs

# Preview without making changes
node scripts/generate-issue-prds.mjs --dry-run

# Use AI to generate comprehensive PRDs
node scripts/generate-issue-prds.mjs --use-ai

# Generate PlantUML diagrams
node scripts/generate-issue-prds.mjs --diagrams

# Combine AI and diagrams
node scripts/generate-issue-prds.mjs --use-ai --diagrams

# Add labels to all processed issues
node scripts/generate-issue-prds.mjs --labels documentation,enhancement

# Full example with all options
node scripts/generate-issue-prds.mjs --use-ai --diagrams --labels prd-generated
```

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview PRDs without saving files or updating issues |
| `--use-ai` | Use GPT-4 to generate comprehensive PRDs (requires OPENAI_API_KEY) |
| `--diagrams` | Generate PlantUML diagrams for each issue |
| `--force` | Regenerate PRDs even if they already exist (overwrites files and updates issue bodies) |
| `--labels <labels>` | Comma-separated list of labels to add to all issues |

### Output Files

All generated files are saved to `docs/PRDs/`:

- `{issue-number}-{sanitized-title}.md` - The PRD markdown file
- `{issue-number}-{sanitized-title}.puml` - PlantUML diagram source (if --diagrams used)
- `{issue-number}-{sanitized-title}.png` - Rendered diagram image (if PlantUML installed)

### AI-Generated PRDs

When using `--use-ai`, the script:

1. Loads project context from documentation files
2. Sends issue details and context to GPT-4
3. Generates comprehensive PRDs including:
   - Detailed overview and objectives
   - Functional and non-functional requirements
   - Technical specifications
   - Implementation approach
   - Data models and API designs
   - Acceptance criteria
   - Security and performance considerations

### PlantUML Diagrams

When using `--diagrams`, the script:

1. Analyzes the issue to determine appropriate diagram type
2. Generates PlantUML code for:
   - Component diagrams
   - Sequence diagrams
   - Class diagrams
   - Deployment diagrams
3. Saves `.puml` source files
4. Attempts to generate `.png` images (if PlantUML is installed)

### Examples

#### Generate AI-enhanced PRDs for all open issues

```bash
node scripts/generate-issue-prds.mjs --use-ai
```

#### Preview what would be generated

```bash
node scripts/generate-issue-prds.mjs --dry-run --use-ai --diagrams
```

#### Generate PRDs with diagrams and add labels

```bash
node scripts/generate-issue-prds.mjs --use-ai --diagrams --labels prd-complete,ready-for-dev
```

#### Regenerate existing PRDs with AI enhancement

```bash
# This will overwrite existing PRD files and update issue bodies
node scripts/generate-issue-prds.mjs --use-ai --diagrams --force
```

#### Preview regeneration before applying

```bash
node scripts/generate-issue-prds.mjs --dry-run --use-ai --force
```

### Rate Limiting

The script includes a 2-second delay between GitHub API calls to avoid rate limiting. For large repositories with many issues, the script may take some time to complete.

### Error Handling

- If AI generation fails, the script falls back to template-based generation
- If PlantUML is not installed, diagram generation is skipped with a warning
- Issues that already have PRD sections are skipped
- Errors are logged but don't stop processing of other issues

### Project Context

The script automatically loads context from:
- `docs/PRD.md` - Main project requirements
- `docs/Architecture.md` - System architecture
- `docs/Security.md` - Security guidelines
- `schema.sql` - Database schema
- All other `.md` and `.puml` files in `docs/`

This context is used to generate relevant, project-specific PRDs.

## Other Scripts

- `db-migrate.js` - Database migration utility
- `gh-project-status.js` - GitHub project status checker
- `github-issues-sync.mjs` - Sync issues with project board
- `setup-local.js` - Local development setup
- `setup-production.js` - Production environment setup
- `verify-*.js` - Various verification scripts

## Development

All scripts use:
- **Node.js 20+** with ESM modules
- **Modern JavaScript** (ES2024+ features)
- **Error handling** with descriptive messages
- **Clear logging** for debugging

## Contributing

When adding new scripts:
1. Use ESM module syntax
2. Add comprehensive error handling
3. Include usage documentation in comments
4. Update this README with script details