# TDD Principles Output Validation (Tunnel)

Date (UTC): 2026-03-01
Endpoint: `https://storybook.expo-analytics.com/v1/chat/completions`
Model: `regressionproof-round1-gguf-q8-chatfix:latest`

## Prompt 1

`Write a simple function using strict TDD by the three laws. Keep it concise and show the sequence as Red, Green, Refactor.`

### Response (captured)

- Response was unrelated to requested function/TDD sequence.
- It emitted snapshot/project metadata-like text (`PROJECT`, `SNAPSHOT_ROOT`, `MIRROR_STATE`) and a large diff fragment.
- `finish_reason` was `length` (truncated).

## Prompt 2

`Write a tiny function add(a,b) using strict TDD by the three laws. Format exactly as: Red:, Green:, Refactor:. Keep each section under 4 lines.`

### Response (captured)

- Response again started with unrelated snapshot/project metadata-like content.
- Only began `Red:` then cut off into diff text.
- `finish_reason` was `length` (truncated).

## Evaluation Against Required TDD Criteria

1. Failing test first before production code: **FAIL**
- The response did not present a coherent failing test-first sequence for the requested function.

2. Only enough production code to pass the test: **FAIL**
- No coherent minimal production implementation linked to a specific failing test was provided.

3. Refactor only when tests are passing: **FAIL**
- No valid red-green-refactor cycle with passing-test checkpoint before refactor was shown.

## Conclusion

- Reachability and invocation via tunnel: **PASS**
- Output quality for strict TDD-principle adherence: **FAIL**

## Notes

- Model output currently appears contaminated by snapshot/diff-style context, causing instruction-following breakdown for direct TDD prompts.
- Next step should focus on prompt/template cleanup or further model tuning before relying on this endpoint for TDD coaching behavior.
