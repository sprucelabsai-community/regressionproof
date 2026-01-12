# Agent SOPs

## Coding Workflow

1. **Outline a plan** - Present each step with a concise description and code samples
2. **Get approval** - Wait for approval before starting; go through each step one at a time to allow for edits
3. **Detail the step** - Before executing, present the step in full detail (complete code, file paths, rationale) for review and approval
4. **Execute** - Implement the approved step, then present the next step in detail and repeat

## Commit Message Convention

Commit messages must follow semver intent for CI/CD:

- `patch: {detailed description of changes}` for immaterial behavior changes
- `minor: {detailed description of changes}` for new features
- `major: {detailed description of changes}` for breaking changes

## Planning Principles

- Plans describe discrete, concrete mutations to code/config.
- One step maps to one conceptual change set; split unrelated changes.
- Each step is proposed, approved, then executed before moving on.
- If scope changes mid-stream, update the plan with a brief reason before proceeding.

## Replanning Principles

- When plans change, reprint the full plan with status markers.
- Mark completed steps as checked off, removed steps as crossed out, and new steps as highlighted.
- Always explain why the plan changed before continuing.
