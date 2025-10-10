# PlantUML Setup Guide

This guide explains how to install PlantUML to enable automatic PNG generation from `.puml` diagram files.

## What is PlantUML?

PlantUML is an open-source tool that allows you to create diagrams from plain text descriptions. The PRD generator creates `.puml` files automatically, and with PlantUML installed, it can also generate `.png` images.

## Installation Options

### Option 1: Using Package Managers (Recommended)

#### macOS (Homebrew)
```bash
brew install plantuml
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install plantuml
```

#### Arch Linux
```bash
sudo pacman -S plantuml
```

#### Windows (Chocolatey)
```bash
choco install plantuml
```

### Option 2: Manual Installation

1. **Install Java** (PlantUML requires Java 8 or higher)
   ```bash
   # Check if Java is installed
   java -version
   
   # If not installed, install Java
   # Ubuntu/Debian:
   sudo apt-get install default-jre
   
   # macOS:
   brew install openjdk
   ```

2. **Download PlantUML JAR**
   - Download from: https://plantuml.com/download
   - Save `plantuml.jar` to a convenient location (e.g., `/usr/local/bin/`)

3. **Create a wrapper script** (optional, for easier usage)
   ```bash
   # Create script at /usr/local/bin/plantuml
   sudo nano /usr/local/bin/plantuml
   ```
   
   Add this content:
   ```bash
   #!/bin/bash
   java -jar /usr/local/bin/plantuml.jar "$@"
   ```
   
   Make it executable:
   ```bash
   sudo chmod +x /usr/local/bin/plantuml
   ```

## Verify Installation

```bash
plantuml -version
```

You should see output like:
```
PlantUML version 1.2023.XX
```

## Usage with PRD Generator

Once PlantUML is installed, the PRD generator will automatically:

1. Generate `.puml` source files
2. Convert them to `.png` images
3. Save both files to `docs/PRDs/`

### Generate PRDs with Diagrams

```bash
# With PlantUML installed, this will create both .puml and .png files
node scripts/generate-issue-prds.mjs --use-ai --diagrams --force
```

### Manual PNG Generation

If you want to manually convert `.puml` files to PNG:

```bash
# Convert a single file
plantuml docs/PRDs/221-demo-workflows.puml

# Convert all .puml files in a directory
plantuml docs/PRDs/*.puml

# Specify output format
plantuml -tpng docs/PRDs/221-demo-workflows.puml
plantuml -tsvg docs/PRDs/221-demo-workflows.puml
```

## Alternative: Online PlantUML Editor

If you don't want to install PlantUML locally, you can:

1. Open the `.puml` file in a text editor
2. Copy the content
3. Paste it into the online editor: http://www.plantuml.com/plantuml/uml/
4. Download the generated PNG/SVG

## Troubleshooting

### "plantuml: command not found"

This means PlantUML is not installed or not in your PATH. Follow the installation steps above.

### "Java not found"

PlantUML requires Java. Install Java first:
```bash
# Check Java version
java -version

# Install if needed (Ubuntu/Debian)
sudo apt-get install default-jre
```

### Diagrams not rendering correctly

1. Check the `.puml` file syntax
2. Try generating manually: `plantuml yourfile.puml`
3. Check PlantUML documentation: https://plantuml.com/

## Benefits of PNG Generation

- **Visual Documentation**: Easy to view diagrams without special tools
- **GitHub Integration**: PNG files display directly in GitHub
- **Presentations**: Ready-to-use images for documentation and presentations
- **Accessibility**: Anyone can view the diagrams without PlantUML

## Note

The PRD generator works perfectly fine without PlantUML installed. You'll still get:
- ✅ Comprehensive PRD markdown files
- ✅ PlantUML source files (`.puml`)
- ❌ PNG images (requires PlantUML)

The `.puml` files can be:
- Viewed in VS Code with PlantUML extensions
- Converted to PNG later when needed
- Shared with team members who have PlantUML installed
- Used in the online PlantUML editor