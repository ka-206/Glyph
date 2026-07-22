# Glyph Evaluation Package

This package contains the evaluation notebook and fixed evaluation corpus used for the Glyph RAG pipeline evaluation.

Contents:

- `notebooks/evaluation.ipynb`
- `evaluation_data/evaluation_questions.csv`
- `evaluation_data/evaluation_answer_key.md`
- `evaluation_data/evaluation_rubric.md`
- `evaluation_data/pdfs/`
- `evaluation_results/evaluation_results_template.csv`

The notebook imports the production RAG functions from `backend/rag.py` and evaluates the same retrieval and generation pipeline used by Glyph.
