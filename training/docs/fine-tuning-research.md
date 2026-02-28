# Fine-Tuning Research Notes

## Scope

These notes document current best practices for fine-tuning a coding model to produce TDD-oriented code and explain whether Python or TypeScript is the better choice for the training pipeline.

This research is intended to feed the round 1 plan in [plan.md](/Users/taylorromero/Development/SpruceLabs/regressionproof/training/docs/plan.md).

## Round 1 Recommendation

- Use a Python-first fine-tuning stack.
- Use regressionproof snapshots from `~/.regressionproof` as the primary supervised repair corpus.
- Use Spruce documentation from `/Users/taylorromero/Development/SpruceLabs/spruce-documentation` as a second corpus for doc-grounded behavior.
- Use LoRA or QLoRA for the first fine-tune rather than full-model fine-tuning.
- Evaluate primarily with execution-based coding metrics, not string similarity.

## Best Practices For TDD-Oriented Coding Fine-Tuning

### 1. Use supervised fine-tuning with structured conversational examples

Hugging Face TRL's `SFTTrainer` supports conversational datasets directly and applies chat templates during preprocessing. That fits the intended round 1 data shape:

- `system`: TDD and coding constraints
- `user`: failing test output, repository context, and documentation context
- `assistant`: repair patch, code edit, or grounded answer

This is a better round 1 fit than inventing a custom format.

Source:
- https://huggingface.co/docs/trl/sft_trainer

### 2. Train on assistant tokens only

TRL supports assistant-only loss for conversational data. For a coding agent, that is the correct default because the training objective should focus on the repair output rather than learning to reconstruct prompts.

Implication for round 1:
- keep prompts rich
- compute loss on assistant responses only

Source:
- https://huggingface.co/docs/trl/sft_trainer

### 3. Use regressionproof snapshots as the core repair signal

The most valuable local data is the sequence:

- failing snapshot at commit `N`
- `.snapshotter/testResults.json` at commit `N`
- repair commit `N+1`

This creates grounded TDD examples where the model sees real failing tests and the next real repair. That is aligned with published results showing that code generation improves when models can use tests and feedback loops during reasoning and repair.

Source:
- Self-Debugging: https://arxiv.org/abs/2304.05128

### 4. Prefer execution-based evaluation over text overlap

For TDD coding, the real question is not whether the generated patch looks similar to the historical patch. The question is whether the generated patch improves test outcomes.

Round 1 evaluation should therefore prioritize:

- fail-to-pass rate
- pass-to-pass rate
- percent of tasks where failing tests are reduced

Text similarity can still be logged, but it should not be the primary gate.

This evaluation direction is an inference from the TDD use case plus the execution-oriented coding literature, not a direct quote from one source.

Supporting sources:
- https://arxiv.org/abs/2304.05128
- https://huggingface.co/docs/transformers/training

### 5. Use parameter-efficient fine-tuning for the first model

QLoRA remains the most practical first pass for a 7B coding model. The original paper shows strong performance while reducing memory requirements enough to make experimentation feasible on modest hardware.

Source:
- QLoRA paper: https://arxiv.org/abs/2305.14314

### 6. Configure 4-bit training the way PEFT and Transformers recommend

For quantized LoRA fine-tuning:

- use `nf4`
- use `bnb_4bit_compute_dtype=torch.bfloat16`
- call `prepare_model_for_kbit_training()`
- prefer `target_modules="all-linear"` when following a QLoRA-style setup

These are explicit PEFT and Transformers recommendations.

Sources:
- https://huggingface.co/docs/peft/en/developer_guides/quantization
- https://huggingface.co/docs/transformers/main/quantization/bitsandbytes

### 7. Validate the pipeline on a small subset before full training

Transformers documentation recommends starting with a smaller subset to verify the entire training stack before scaling up. This is especially important here because the round 1 dataset is custom and assembled from multiple local sources.

Source:
- https://huggingface.co/docs/transformers/training

### 8. Align tokenizer and chat template details with the base model

If the round 1 model is Qwen-family, the tokenizer and EOS token must be aligned with the model's chat template. TRL explicitly calls this out for Qwen variants.

Source:
- https://huggingface.co/docs/trl/sft_trainer

## How Regressionproof Snapshots Should Be Used

Regressionproof snapshots at `~/.regressionproof` should not be treated as generic code corpora. They should be converted into repair tasks.

Recommended round 1 record shape:

- snapshot root
- project name
- failing commit SHA
- failing `.snapshotter/testResults.json`
- extracted failing tests and error text
- repository diff or relevant file context at failing commit
- next commit repair patch as assistant target

Recommended round 1 task type:

- `snapshot_repair`

Why this matters:

- the examples are grounded in actual developer TDD loops
- the labels are already aligned to observed repair behavior
- the data naturally captures minimal iterative progress instead of polished final rewrites

## How Spruce Documentation Should Be Used

Spruce documentation at `/Users/taylorromero/Development/SpruceLabs/spruce-documentation` should be used as a separate corpus, not just pasted into repair prompts without structure.

Recommended round 1 task type:

- `doc_grounding`

Recommended uses:

- teach the model to answer from documentation without inventing rules
- teach the model to preserve concrete commands, file paths, and constraints
- teach the model to stay aligned with project conventions while solving coding tasks

Recommended record shape:

- documentation source path
- bounded markdown chunk
- instruction asking for concrete commands, constraints, or implementation guidance
- assistant answer grounded only in that chunk

## Recommended Round 1 Dataset Mix

Use two supervised task families in the same fine-tune:

1. `snapshot_repair`
2. `doc_grounding`

Why mix them:

- `snapshot_repair` teaches repair behavior from real TDD traces
- `doc_grounding` teaches adherence to project rules and written guidance

This is a practical way to satisfy both project guardrails in one model without needing a larger multi-stage pipeline in round 1.

## Python vs TypeScript For Training Scripts And Tooling

### Recommendation

Use Python as the primary language for:

- dataset normalization
- train and eval splitting
- training
- inference evaluation
- metrics and reporting

Use TypeScript only where it offers a local repo advantage, such as:

- extracting data from snapshot mirrors
- thin CLI wrappers
- reusing existing monorepo parsing code

### Why Python Is The Better Primary Choice

The modern fine-tuning stack is documented and maintained as a Python workflow:

- Transformers training APIs are Python-first
- TRL `SFTTrainer` is Python-first
- PEFT quantization guidance is Python-first
- Accelerate launcher and distributed setup are Python-first

Sources:
- https://huggingface.co/docs/transformers/training
- https://huggingface.co/docs/trl/sft_trainer
- https://huggingface.co/docs/peft/en/developer_guides/quantization
- https://huggingface.co/docs/accelerate/main/en/basic_tutorials/install

### Why TypeScript Is The Wrong Primary Choice For Round 1

The JavaScript stack is not the main fine-tuning path for this workload. Transformers.js is primarily positioned for JS inference in browser or JS runtime contexts, not as the main training and PEFT fine-tuning environment for a coding model.

Source:
- https://huggingface.co/docs/transformers.js/index

## Concrete Round 1 Implications

### Training stack

- Python virtualenv inside `training/`
- `transformers`
- `trl`
- `peft`
- `accelerate`
- `bitsandbytes`

### Data pipeline

- TypeScript is acceptable for snapshot extraction from `~/.regressionproof`
- Python should own normalization, split generation, training, evaluation, and metrics

### Evaluation gates

- primary: execution-based improvement on held-out snapshot repair tasks
- secondary: doc-grounding quality on held-out Spruce documentation tasks
- tertiary: optional text-similarity diagnostics

## Recommended Changes To The Existing Plan

The round 1 plan should be updated to reflect these research findings:

1. Replace generic LoRA configuration with explicit QLoRA-friendly settings from PEFT and Transformers guidance.
2. Make assistant-only loss an explicit training requirement.
3. Replace text-similarity-only evaluation gates with execution-based snapshot evaluation as the primary metric.
4. Keep documentation tasks in the training mix, but evaluate them separately from repair tasks.
5. Keep Python as the primary language for the training and evaluation pipeline.
6. Reserve TypeScript for extraction steps only if it materially simplifies local snapshot parsing.

## Source List

- TRL SFT Trainer: https://huggingface.co/docs/trl/sft_trainer
- Transformers training: https://huggingface.co/docs/transformers/training
- PEFT quantization guide: https://huggingface.co/docs/peft/en/developer_guides/quantization
- Transformers bitsandbytes quantization: https://huggingface.co/docs/transformers/main/quantization/bitsandbytes
- Accelerate installation and launcher basics: https://huggingface.co/docs/accelerate/main/en/basic_tutorials/install
- Transformers.js overview: https://huggingface.co/docs/transformers.js/index
- Self-Debugging paper: https://arxiv.org/abs/2304.05128
- QLoRA paper: https://arxiv.org/abs/2305.14314

## Using Regressionproof Micro-Step Data

Regressionproof captures a much finer signal than commit-level or PR-level data. The key property is that it records very small, sequential changes rather than only the final red-green-refactor state. That makes it closer to process supervision than ordinary outcome supervision.

This section covers how to use that granular signal as fine-tuning data.

### Why The Micro-Step Signal Is Valuable

OpenAI's process supervision work argues that supervising intermediate steps can outperform supervising only final outcomes. While that work is in math, the same structural argument applies here: if the model is rewarded only for the final passing patch, it does not learn the disciplined sequence of small edits that got there. Regressionproof micro-steps expose that missing process.

Source:
- https://openai.com/research/improving-mathematical-reasoning-with-process-supervision

LintSeq is directly relevant to code. It shows that training on edit sequences rather than only single-shot programs can improve code synthesis behavior and repeated-sampling performance. The core takeaway is that sequence-aware edit supervision contains information that is absent in coarse final-state data.

Source:
- https://lintseq.github.io/

daVinci-Dev is also relevant because it treats software engineering data as trajectories and explicitly converts structured software change histories into LLM-trainable text. That supports the idea that change histories should be linearized as trajectories, not flattened into isolated examples with all sequencing removed.

Source:
- https://huggingface.co/datasets/GAIR/daVinci-Dev/blob/main/README.md

### How Micro-Step Diff Data Maps To Training Formats

Regressionproof micro-steps can be represented in three training formats. The best round 1 choice is conversational prefix-completion, but all three are viable.

#### 1. Prefix-completion

Recommended default.

Structure:
- prefix/input: current repository state summary + latest failing test output + prior micro-step history + optional doc context
- completion/label: exactly the next micro-diff

Why it fits:
- TRL supports prompt-completion data directly.
- Loss can be computed only on the completion.
- It maps cleanly to "predict the next edit" rather than "rewrite the whole file."

Source:
- https://huggingface.co/docs/trl/sft_trainer

Practical regressionproof example:

Input:
- current file snapshot or focused hunk
- current failing test error
- step index `k`
- immediately preceding edits `1..k-1`

Label:
- diff from state `k` to state `k+1`

#### 2. Conversational SFT

Also recommended when you want richer multi-field prompts.

Structure:
- `system`: edit discipline and TDD constraints
- `user`: current state, failing tests, relevant docs, prior edits
- `assistant`: next micro-step diff

Why it fits:
- TRL supports conversational datasets directly.
- `assistant_only_loss=True` lets the model learn only from the next-step output.

Source:
- https://huggingface.co/docs/trl/sft_trainer

This is functionally a richer version of prefix-completion.

#### 3. Plain next-token language modeling over serialized trajectories

Possible, but weaker for round 1.

Structure:
- serialize the entire trajectory into one text sequence and train autoregressively

Why it is less attractive:
- it gives less precise control over which tokens are supervised
- it makes it harder to cleanly separate context from target edit
- it is more likely to encourage memorization of trajectory framing tokens rather than the next edit itself

Recommendation:
- do not use plain language-modeling format as the primary round 1 format
- use it only if you later want agent-native mid-training on very large unlabelled or weakly labelled trajectories

### What Training Signal Exists At Each Micro-Step

Each micro-step exposes more supervision than a normal commit dataset.

For step `k`, the available signal is:

1. Current code state
- the exact source tree after step `k-1`

2. Edit action
- the human-performed diff from step `k-1` to `k`

3. Local intent proxy
- whether the step occurred during test-writing or production-code-writing
- whether the edited file is a test file, source file, config file, or documentation file

4. Execution feedback
- current `.snapshotter/testResults.json`
- failing tests, passing tests, counts, and stack traces

5. Temporal context
- the ordered list of prior micro-steps in the same trajectory

6. Outcome delta
- whether this step reduced failing tests, introduced failures, or made no execution-visible change

7. Documentation context
- relevant Spruce docs for the repository or workflow being edited

This makes each step a process-supervision example, not just an edit example.

### Recommended Training Example Shapes For Micro-Steps

The most important design decision is to train on the next micro-step, not on the whole final patch.

#### Format A: Next-step diff prediction

Recommended as the core round 1 format.

Input:
- project name
- file path or focused hunk
- current code before the edit
- current failing tests and stack traces
- last `N` micro-steps in the same trajectory
- optional relevant Spruce documentation chunk

Output:
- the exact next diff only

Why:
- aligns directly with regressionproof's smallest available action
- teaches minimality
- reduces the chance that the model jumps to a large speculative rewrite

#### Format B: State-to-state patch prediction

Input:
- current repository state at step `k`
- execution state at step `k`

Output:
- patch from step `k` to step `k+1`

This is similar to Format A but without explicit prior edit history. Use it for simpler baselines.

#### Format C: Step classification or scoring auxiliary target

Useful as an extra signal, not a primary generation format.

Input:
- current step context

Output:
- metadata label such as:
  - `writes_test`
  - `writes_prod_code`
  - `refactor_only`
  - `reduces_failures`
  - `no_test_change`

This can support either:
- multi-task training
- offline dataset analysis
- filtering or curriculum design

#### Format D: Multi-step continuation

Input:
- current state plus short history

Output:
- next `m` micro-steps

Use sparingly in round 1. It may help with planning, but it weakens the minimal-step bias that makes the dataset special.

### Whether Ordering And Sequencing Matter

Yes. Ordering matters at two levels.

#### 1. Within a single trajectory

This ordering must be preserved.

The sequence contains real process information:
- tests are often introduced before production code
- scaffolding steps precede assertions
- tiny repair edits often follow specific failure messages
- some steps are safe only after earlier steps exist

LintSeq is strong evidence that representing code creation as a sequence of edits carries information that is lost when only the final artifact is used.

Source:
- https://lintseq.github.io/

Recommended rule:
- preserve exact chronological order within every regressionproof trajectory

#### 2. Across different trajectories

Global ordering matters less.

You can shuffle examples across projects during training, but you should not shuffle steps inside a trajectory. The right compromise is:

- preserve chronological order inside each example's local history
- randomize batch order across independent trajectories

This point is partly an inference from sequence-model training practice and the edit-sequence literature.

### How To Preserve And Exploit Sequencing

There are several good ways to exploit the ordering instead of merely preserving it.

#### 1. Include a bounded history window

For step `k`, include the previous `1-5` micro-steps in the prompt.

Why:
- lets the model infer local intent
- lets the model learn patterns like "write failing assertion, then implement minimal production fix"
- exposes whether the current move is exploratory, corrective, or cleanup

#### 2. Add explicit step indices

Include fields like:
- `trajectory_id`
- `step_index`
- `steps_remaining_unknown`

Why:
- helps the model distinguish early setup from late cleanup
- makes the prompt structure stable

#### 3. Add state-delta metadata

For each step, derive:
- failed test count before and after
- passed test count before and after
- changed file types
- added lines and deleted lines

Why:
- this provides dense training metadata
- it supports filtering and curriculum design

#### 4. Train with mixed horizons

Use mostly single-step targets, with a smaller number of 2-step or 3-step continuation targets.

Why:
- single-step targets preserve minimality
- short continuation targets help the model learn local plans

### Special Considerations For Ultra-Granular Data

Ultra-granular data is powerful, but it creates specific risks.

#### 1. The model may overfit to tiny local moves

If every target is extremely small, the model may become good at local patching but weak at higher-level repair planning.

Mitigation:
- keep most examples as single-step targets
- add a smaller fraction of multi-step continuation examples
- mix in coarser snapshot-repair examples for broader context

#### 2. Many steps are semantically incomplete in isolation

A single tiny diff may not make sense without recent history.

Mitigation:
- include recent micro-step history
- include current failing test state
- include focused code context around the edited region

#### 3. Some micro-steps do not change test outcomes

That is not noise. In TDD, many useful steps are preparatory:
- naming
- setup
- fixture shaping
- assertion scaffolding
- import correction

Mitigation:
- do not filter strictly on "step caused more tests to pass"
- instead label step outcome type and keep useful neutral steps

This is an inference from the stated regressionproof collection behavior and TDD workflow.

#### 4. Repeated near-duplicate edits can dominate training

Micro-step trajectories will contain many almost-identical states.

Mitigation:
- deduplicate exact duplicates
- cap repeated boilerplate patterns
- stratify by project and failure type

#### 5. Context window pressure rises quickly

Long trajectories can consume too much prompt budget.

Mitigation:
- keep full trajectory offline
- train on sliding local windows
- include only the current state, failing tests, and the last few micro-steps

### Best Round 1 Dataset Construction Strategy For Regressionproof Micro-Steps

Recommended round 1 mix:

1. Micro-step next-diff examples
- primary corpus
- teaches minimal TDD behavior

2. Coarser snapshot-repair examples
- secondary corpus
- teaches larger repair moves and outcome alignment

3. Spruce doc-grounding examples
- secondary corpus
- teaches adherence to project rules and commands

This gives the first model both:
- process supervision from micro-steps
- stronger outcome supervision from coarser repair states
- policy and convention supervision from documentation

### Recommended Example Schema For Micro-Step Training

Recommended fields:

```json
{
  "kind": "micro_step_repair",
  "trajectoryId": "project:commit-sequence-or-snapshot-sequence",
  "project": "example-project",
  "snapshotRoot": "~/.regressionproof",
  "stepIndex": 7,
  "history": [
    {"stepIndex": 4, "diff": "..."},
    {"stepIndex": 5, "diff": "..."},
    {"stepIndex": 6, "diff": "..."}
  ],
  "currentState": {
    "files": [{"path": "src/foo.ts", "content": "..."}],
    "testResults": {"failedTests": 2, "passedTests": 19}
  },
  "docContext": {
    "sourcePath": "/Users/taylorromero/Development/SpruceLabs/spruce-documentation/...",
    "content": "..."
  },
  "messages": [
    {"role": "system", "content": "Produce the next minimal TDD edit."},
    {"role": "user", "content": "Current state, recent steps, and failing tests..."},
    {"role": "assistant", "content": "diff --git ..."}
  ]
}
```

### Recommended Round 1 Training Objective

For regressionproof micro-step data, the best round 1 objective is:

- conversational SFT or prompt-completion SFT
- assistant-only or completion-only loss
- target equals the next micro-step diff

Not recommended as the primary objective:
- whole-file regeneration
- final-answer-only supervision
- full-trajectory language modeling with no separation between context and target

### Recommended Round 1 Evaluation For Micro-Step Data

Evaluation should mirror the granularity of the data.

Primary metrics:
- exact application rate of the generated diff
- syntactic validity after patch application
- fraction of steps that preserve or improve test status
- average failed-test delta after the generated micro-step

Secondary metrics:
- whether the generated step type matches the human step type
- whether the model produces minimal diffs rather than oversized rewrites

Longer-horizon metric:
- roll out generated micro-steps for `n` steps and measure whether the trajectory converges toward green faster than baseline

### Plan Impact

The current round 1 plan should eventually be extended with a third training family in addition to:

- `snapshot_repair`
- `doc_grounding`

Add:

- `micro_step_repair`

That new family should use regressionproof's discrete line-change history as process-supervised next-step data.

## Additional Sources For This Section

- OpenAI process supervision: https://openai.com/research/improving-mathematical-reasoning-with-process-supervision
- LintSeq: https://lintseq.github.io/
- daVinci-Dev dataset card: https://huggingface.co/datasets/GAIR/daVinci-Dev/blob/main/README.md
