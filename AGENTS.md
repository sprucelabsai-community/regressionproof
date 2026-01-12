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
- Each step must explicitly list the concrete file changes (add/remove/modify) it will make.
- If scope changes mid-stream, update the plan with a brief reason before proceeding.

## Research Principles

- Research (reading files, scanning logs, running read-only commands) can proceed without a formal plan or step approvals.
- Always complete research before making suggestions.
- Never stop research based on initial findings.
- Focus on holistic and detailed analysis: both wide (breadth) and deep (depth).
- When scanning for documentation, check `docs/` in addition to root-level files.
- Treat `docs/PROJECT.md` as critical project-specific instructions and read it early.
- Any code/config changes, script edits, or stateful commands still require the full plan/approval workflow.

## Replanning Principles

- When plans change, reprint the full plan with status markers.
- Mark completed steps as checked off, removed steps as crossed out, and new steps as highlighted.
- Always explain why the plan changed before continuing.

## Bugfixing Principles

- Investigate problems thoroughly (think RCA) before proposing fixes.
- Explain the understood issue back to the user to prove comprehension.
- No "stabbing at things" or guesswork changes.
- If the problem is not understood, zoom out and review again.

## Coding Standards

- Prefer OOP designs; use composition where possible.
- Maximum of one inheritance layer.
- Keep things DRY: after writing code, review for reuse opportunities and extract shared pieces.
- Place type definitions at the bottom of files.
- All class names are to be capitalized in PascalCase.
- Files that define a class should be named after that class in PascalCase (e.g., `DataFetcher.py` for class `DataFetcher`) and the class should be the default export.
- We take types and formatting seriously, consider running `yarn fix.lint` after making changes.

## SOLID Principles for AI Agents

Applying these five design principles helps prevent "super-agent" bloat, reduces fragility when switching LLM providers, and ensures specialized agents collaborate effectively.

### 1. Single Responsibility Principle (SRP)
- **Definition:** An agent should have one, and only one, reason to change. It should focus on a single core task.
- **Detailed Explanation:** In agentic workflows, SRP prevents monolithic "God Agents" that handle everything from data retrieval to final formatting. Instead, break workflows into specialized sub-agents. This improves reliability by giving each agent a tighter, more focused system prompt.
- **Example:**
  - **Bad:** A "Support Agent" that reads emails, queries the database, processes returns, and sends confirmation emails.
  - **Good:** A Classifier Agent (categorizes intent) -> A Retrieval Agent (fetches data) -> A Resolution Agent (proposes action) -> A Writer Agent (drafts response).

### 2. Open-Closed Principle (OCP)
- **Definition:** Agents should be open for extension but closed for modification.
- **Detailed Explanation:** You should be able to add new capabilities to your system (extension) without rewriting the core orchestration logic (modification). This is typically achieved through standardized protocols and pluggable tool interfaces.
- **Example:**
  - **Scenario:** Your orchestrator works with a "Search Tool." If you want to add "Voice Search," you shouldn't have to rewrite the orchestrator.
  - **Implementation:** Define a BaseTool interface. New tools like VoiceSearchTool inherit from BaseTool. The orchestrator interacts with BaseTool, automatically supporting any new tool you add later.

### 3. Liskov Substitution Principle (LSP)
- **Definition:** Subclasses or specific agent implementations must be substitutable for their base types without altering the correctness of the system.
- **Detailed Explanation:** In 2026, agents often swap between different LLMs (e.g., GPT-5 to Claude 4) or specialized models for cost/speed. LSP ensures that if you swap a "Reasoning Agent" for a faster "Drafting Agent," the system's output format and interface remain consistent so the next agent in the pipeline doesn't break.
- **Example:**
  - If your system expects a SearchAgent to return a JSON list of URLs, any new VectorSearchAgent must also return a JSON list of URLs, not raw text or markdown, to ensure downstream compatibility.

### 4. Interface Segregation Principle (ISP)
- **Definition:** An agent should not be forced to depend on tools or interfaces it does not use.
- **Detailed Explanation:** Don't give an agent a massive toolkit if it only needs one tool. Large context windows filled with irrelevant tool descriptions lead to "tool-use hallucinations" and increased token costs. Create smaller, specific "toolsets" for specific agent roles.
- **Example:**
  - **Bad:** Giving a "Proofreading Agent" access to DeleteDatabase, SendEmail, and WriteFile.
  - **Good:** Giving it a specific TextEditing interface that only exposes ReadText and SubmitCorrection.

### 5. Dependency Inversion Principle (DIP)
- **Definition:** Depend on abstractions, not concretions. High-level agent logic should not depend on low-level implementation details.
- **Detailed Explanation:** Your core business logic shouldn't be hard-coded to a specific LLM API or a specific database. Instead, the agent should depend on an abstract "Inference Provider" or "Data Store" interface. This allows you to switch from OpenAI to an in-house Llama model just by changing the underlying implementation.
- **Example:**
  - **Concretion (Bad):** OpenAI.chat_completion(prompt) called directly inside your agent code.
  - **Abstraction (Good):** Agent.generate(prompt) which calls an abstract LLMProvider. You can then "inject" OpenAIProvider, AnthropicProvider, or LocalModelProvider at runtime.
