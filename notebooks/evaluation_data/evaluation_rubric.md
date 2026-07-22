# Glyph Evaluation Rubric

## Response Accuracy

Each generated answer is compared with the reference answer.

- **1.0** — Correct and complete; supported by the retrieved document context.
- **0.5** — Partially correct, incomplete, or missing an important detail.
- **0.0** — Incorrect, unsupported, or unrelated.

The binary response-accuracy percentage is calculated from the `correct_binary` field.

## Retrieval Relevance

- **1** — At least one retrieved chunk contains the evidence needed to answer the question.
- **0** — Retrieved chunks do not contain the relevant evidence.

## User Satisfaction

A manual 1–5 rating is recorded for each answer:

1. Very poor
2. Poor
3. Acceptable
4. Good
5. Excellent

## Failure Case Labels

Use concise descriptions such as:

- `OCR / extraction failure`
- `Irrelevant retrieval`
- `Incomplete multi-section answer`
- `Unsupported answer`
- `Other`
