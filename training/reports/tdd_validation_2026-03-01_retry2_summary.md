# TDD Validation Retry 2 Summary

Date: 2026-03-01
Host: odin1.local
Endpoint: http://127.0.0.1:6006/api/chat
Probe settings: temperature=0, num_predict=80

## Model Results

### regressionproof-round1-gguf-q8-chatfix:latest
- scenarios: 4
- truncation_count: 4
- contamination_count: 4
- law1_pass_count: 0
- law2_pass_count: 0
- law3_pass_count: 0

Observed pattern:
- all scenarios returned `done_reason=length`
- responses contaminated with stack traces / telemetry-like artifacts

### regressionproof-round1-gguf-q8:latest
- scenarios: 4
- truncation_count: 0
- contamination_count: 0
- law1_pass_count: 0
- law2_pass_count: 0
- law3_pass_count: 0

Observed pattern:
- responses ended with `done_reason=stop`
- outputs were non-substantive for strict TDD rubric checks

## Gate Outcome

Retry 2 failed overall.
- no model variant passed all required TDD gates.
