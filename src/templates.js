function projectReadmeTemplate(projectSlug, sourcePath, today) {
  return `---
type: project
status: active
created: ${today}
updated: ${today}
source_path: ${sourcePath}
tags:
  - project
---

# ${projectSlug}

## Source Path
\`${sourcePath}\`

## Goal
- What this project is trying to achieve

## Users
- Who this project is for

## Scope
- What is in scope
- What is out of scope

## Stack
- Primary technologies

## Constraints
- Technical, product, or business constraints

## Current status
- Current milestone
- Current blockers

## Working model
- Source code lives in the external repo at \`source_path\`
- Durable memory lives in this project capsule inside the vault
- Research that generalizes across projects should be moved to global \`Research\` or \`Notes\`

## Links
- [[Tasks]]
- [[Decisions]]
- [[Research]]
- [[Notes]]
- [[Artifacts]]
`;
}

function tasksTemplate(projectSlug, today) {
  return `---
type: tasks
project: ${projectSlug}
status: active
updated: ${today}
tags:
  - tasks
---

# Tasks

## Now
- [ ] 

## Next
- [ ] 

## Later
- [ ] 

## Done
- [ ] 
`;
}

function decisionsTemplate(projectSlug, today) {
  return `---
type: decisions
project: ${projectSlug}
status: active
updated: ${today}
tags:
  - decisions
---

# Decisions
`;
}

function rootAgentsBlock(vaultRoot, projectRoot) {
  return `This repository writes durable agent memory to the external Obsidian vault at:

\`${vaultRoot}\`

Project capsule:

\`${projectRoot}\`

Fast path:

- \`agent-bootstrap context\`

After meaningful work, write back to the vault:

- \`Tasks.md\` for status and next steps
- \`Decisions.md\` for technical decisions
- \`Research/\` for project-specific research
- global \`Research\` or \`Notes\` for reusable insights

Preferred command family:

\`agent-bootstrap context\`
\`agent-bootstrap memory <task|decision|research|note> ...\``;
}

function githubAgentBlock(vaultRoot, projectRoot) {
  return `## External memory bridge

This repository uses an external Obsidian vault as its durable memory layer.

- Vault path: \`${vaultRoot}\`
- Project capsule: \`${projectRoot}\`
- Project README: \`${projectRoot}/README.md\`
- Project tasks: \`${projectRoot}/Tasks.md\`
- Project decisions: \`${projectRoot}/Decisions.md\`
- Project research: \`${projectRoot}/Research/\`

Fast path:

- Run \`agent-bootstrap context\`

After meaningful work, write durable memory back into the vault with:

\`agent-bootstrap memory <task|decision|research|note> ...\``;
}

function vaultMemoryDoc(vaultRoot, projectRoot) {
  return `# Vault Memory Bridge

This repository is paired with an external Obsidian vault for durable agent memory.

## Paths

- Vault root: \`${vaultRoot}\`
- Vault guide: \`${vaultRoot}/AGENTS.md\`
- Project capsule: \`${projectRoot}\`

## Fast path

- \`agent-bootstrap context\`

## Write-back

Use:

\`agent-bootstrap memory <task|decision|research|note> ...\`
`;
}

module.exports = {
  projectReadmeTemplate,
  tasksTemplate,
  decisionsTemplate,
  rootAgentsBlock,
  githubAgentBlock,
  vaultMemoryDoc
};
