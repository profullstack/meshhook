#!/usr/bin/env node

/**
 * OpenAI PRD Generator Service
 * Uses GPT-4 to generate comprehensive Product Requirements Documents
 * with PlantUML diagrams and additional documentation
 */

import OpenAI from "openai";
import { config } from "dotenv";

// Load environment variables
config();

/**
 * Initialize OpenAI client
 */
function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY not found in environment variables. " +
      "Please add it to your .env file."
    );
  }

  return new OpenAI({ apiKey });
}

/**
 * Generate comprehensive PRD content using GPT-4
 * @param {Object} issue - GitHub issue object
 * @param {Object} context - Project context with documentation
 * @returns {Promise<Object>} Generated PRD content with sections
 */
export async function generatePRDWithAI(issue, context) {
  const openai = createOpenAIClient();
  
  const { number, title, body, milestone, labels } = issue;
  const labelNames = labels.map((l) => l.name).join(", ");
  const milestoneName = milestone?.title || "None";

  // Build comprehensive context for AI
  const projectContext = buildProjectContext(context);
  
  const systemPrompt = `You are a technical product manager and software architect creating detailed Product Requirements Documents (PRDs) for a webhook-first, deterministic, Postgres-native workflow engine called MeshHook.

MeshHook delivers n8n's visual simplicity and Temporal's durability without restrictive licensing. It features:
- Webhook triggers with signature verification
- Visual DAG builder using SvelteKit/Svelte 5
- Durable, replayable runs via event sourcing
- Live logs via Supabase Realtime
- Multi-tenant RLS security

Your task is to create a comprehensive, actionable PRD that includes:
1. Clear overview and objectives
2. Detailed functional and non-functional requirements
3. Technical specifications with architecture considerations
4. Data models and API designs (when applicable)
5. Implementation approach with step-by-step guidance
6. Acceptance criteria and testing strategy
7. Security and performance considerations

Be specific, technical, and actionable. Reference the existing project architecture and patterns.`;

  const userPrompt = `Create a comprehensive PRD for the following GitHub issue:

**Issue #${number}: ${title}**
**Milestone:** ${milestoneName}
**Labels:** ${labelNames || "None"}

**Issue Description:**
${body || "No description provided"}

**Project Context:**
${projectContext}

Generate a detailed PRD that includes:
1. Overview section explaining the task's purpose and alignment with project goals
2. Functional requirements (specific, measurable, actionable)
3. Non-functional requirements (performance, security, reliability)
4. Technical specifications including:
   - Architecture context and integration points
   - Implementation approach with clear steps
   - Data model changes (if applicable)
   - API endpoints (if applicable)
5. Acceptance criteria as a checklist
6. Dependencies and prerequisites
7. Implementation notes including:
   - Development guidelines
   - Testing strategy
   - Security considerations
   - Monitoring and observability

Make it specific to this task while following the project's patterns and conventions.`;

  try {
    console.log(`  🤖 Generating PRD with GPT-4...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const prdContent = completion.choices[0].message.content;
    
    return {
      markdown: prdContent,
      metadata: {
        issueNumber: number,
        issueTitle: title,
        milestone: milestoneName,
        labels: labelNames,
        generatedAt: new Date().toISOString(),
        model: "gpt-4-turbo-preview",
      }
    };
  } catch (error) {
    console.error(`  ❌ OpenAI API error: ${error.message}`);
    throw error;
  }
}

/**
 * Generate PlantUML diagram for the issue
 * @param {Object} issue - GitHub issue object
 * @param {Object} context - Project context
 * @returns {Promise<string>} PlantUML diagram code
 */
export async function generatePlantUMLDiagram(issue, context) {
  const openai = createOpenAIClient();
  
  const { title, body } = issue;

  const systemPrompt = `You are a software architect creating PlantUML diagrams for technical documentation.

Generate clear, well-structured PlantUML diagrams that visualize:
- Component relationships
- Sequence flows
- Data models
- Architecture patterns

Use proper PlantUML syntax and follow best practices for diagram clarity.`;

  const userPrompt = `Create a PlantUML diagram for this task:

**Task:** ${title}
**Description:** ${body || "No description provided"}

Generate an appropriate diagram type (component, sequence, class, or deployment) that best illustrates this feature or task. Include:
- Key components and their relationships
- Data flow or sequence of operations
- Integration points with existing system

Return ONLY the PlantUML code, starting with @startuml and ending with @enduml.`;

  try {
    console.log(`  🎨 Generating PlantUML diagram...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const diagramCode = completion.choices[0].message.content;
    
    // Extract PlantUML code if wrapped in markdown
    const match = diagramCode.match(/@startuml[\s\S]*@enduml/);
    return match ? match[0] : diagramCode;
  } catch (error) {
    console.error(`  ⚠️  Could not generate PlantUML diagram: ${error.message}`);
    return null;
  }
}

/**
 * Generate additional documentation sections
 * @param {Object} issue - GitHub issue object
 * @param {string} sectionType - Type of section (e.g., 'testing', 'security', 'deployment')
 * @returns {Promise<string>} Generated section content
 */
export async function generateDocumentationSection(issue, sectionType) {
  const openai = createOpenAIClient();
  
  const { title, body } = issue;

  const sectionPrompts = {
    testing: "Create a comprehensive testing strategy including unit tests, integration tests, and e2e tests with specific test cases.",
    security: "Detail security considerations, potential vulnerabilities, and mitigation strategies specific to this feature.",
    deployment: "Provide deployment instructions, rollback procedures, and monitoring setup for this feature.",
    performance: "Analyze performance implications, optimization strategies, and benchmarking approaches.",
  };

  const systemPrompt = `You are a technical documentation specialist creating detailed documentation sections for software features.`;

  const userPrompt = `Create a ${sectionType} section for this task:

**Task:** ${title}
**Description:** ${body || "No description provided"}

${sectionPrompts[sectionType] || `Create detailed ${sectionType} documentation.`}

Be specific, actionable, and include code examples where appropriate.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error(`  ⚠️  Could not generate ${sectionType} section: ${error.message}`);
    return null;
  }
}

/**
 * Build project context string from documentation files
 * @param {Object} context - Project context object
 * @returns {string} Formatted context string
 */
function buildProjectContext(context) {
  const relevantFiles = [
    "docs/PRD.md",
    "docs/Architecture.md",
    "docs/Security.md",
    "schema.sql"
  ];

  let contextStr = "";
  
  for (const file of relevantFiles) {
    if (context.files[file]) {
      const content = context.files[file];
      // Truncate very long files to avoid token limits
      const truncated = content.length > 3000 
        ? content.substring(0, 3000) + "\n...(truncated)"
        : content;
      contextStr += `\n\n--- ${file} ---\n${truncated}`;
    }
  }

  return contextStr || "No additional context available.";
}

/**
 * Fix PlantUML syntax errors using OpenAI
 * @param {string} pumlContent - The PlantUML content with errors
 * @param {string} errorMessage - The error message from PlantUML validation
 * @returns {Promise<string|null>} Fixed PlantUML code or null if fix failed
 */
export async function fixPlantUMLWithAI(pumlContent, errorMessage) {
  const openai = createOpenAIClient();

  const systemPrompt = `You are a PlantUML expert who fixes syntax errors in PlantUML diagrams.

Your task is to:
1. Analyze the PlantUML code and error message
2. Identify and fix syntax errors
3. Return ONLY the corrected PlantUML code
4. Ensure the diagram maintains its original intent and structure

Common PlantUML issues to fix:
- Missing @startuml or @enduml tags
- Invalid arrow syntax (use --> or -> for connections)
- Unclosed quotes or brackets
- Invalid participant or component names
- Incorrect sequence diagram syntax
- Missing or extra spaces in keywords`;

  const userPrompt = `Fix the following PlantUML code that has syntax errors:

**Error Message:**
${errorMessage}

**PlantUML Code:**
\`\`\`plantuml
${pumlContent}
\`\`\`

Return ONLY the corrected PlantUML code, starting with @startuml and ending with @enduml. Do not include any explanations or markdown formatting.`;

  try {
    console.log(`  🔧 Attempting to fix PlantUML syntax with AI...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more deterministic fixes
      max_tokens: 2000,
    });

    const fixedCode = completion.choices[0].message.content;
    
    // Extract PlantUML code if wrapped in markdown
    const match = fixedCode.match(/@startuml[\s\S]*@enduml/);
    const result = match ? match[0] : fixedCode;
    
    console.log(`  ✓ AI generated fixed PlantUML code`);
    return result;
  } catch (error) {
    console.error(`  ❌ AI fix failed: ${error.message}`);
    return null;
  }
}

/**
 * Validate OpenAI API key is configured
 * @returns {boolean} True if API key is configured
 */
export function validateOpenAIConfig() {
  return !!process.env.OPENAI_API_KEY;
}