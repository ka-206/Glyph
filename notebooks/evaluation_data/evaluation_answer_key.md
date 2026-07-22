# Glyph Evaluation Answer Key

The answer key contains the reference answers used for manual response-accuracy evaluation.

## OCR01 — Why is the quality of the knowledge base important in a RAG system?

**Expected answer:** The knowledge base defines the information available to the RAG system. If document parsing introduces errors, the retrieved evidence and the final generated answer can also be affected.

**Relevant page:** 1  
**Difficulty:** easy

## OCR02 — What is OHRBench designed to evaluate?

**Expected answer:** OHRBench is designed to study the cascading impact of OCR errors and OCR noise on retrieval-augmented generation systems.

**Relevant page:** 3  
**Difficulty:** easy

## OCR03 — How many documents and question-answer pairs are included in OHRBench?

**Expected answer:** OHRBench contains 350 unstructured PDF documents and 4,598 question-answer pairs.

**Relevant page:** 3  
**Difficulty:** easy

## OCR04 — What are the six application domains represented in OHRBench?

**Expected answer:** The six domains are textbook, manual, academic paper, newspaper, finance, and law.

**Relevant page:** 3  
**Difficulty:** easy

## OCR05 — What are the two primary types of OCR noise identified in the study?

**Expected answer:** The two types are Semantic Noise and Formatting Noise.

**Relevant page:** 4  
**Difficulty:** easy

## OCR06 — How does Semantic Noise differ from Formatting Noise?

**Expected answer:** Semantic Noise changes the meaning or content of extracted information, while Formatting Noise changes its representation or presentation without necessarily changing the underlying semantics.

**Relevant page:** 4  
**Difficulty:** medium

## OCR07 — Which metrics are used to evaluate retrieval and generation?

**Expected answer:** Retrieval is evaluated with LCS@1, while generation is evaluated with Exact Match and F1-score.

**Relevant page:** 6  
**Difficulty:** medium

## OCR08 — What happens to RAG performance as Semantic Noise increases?

**Expected answer:** Performance declines substantially across retrieval and generation, with the study reporting performance degradation approaching 50% in some settings as semantic perturbation increases from mild to severe.

**Relevant page:** 7  
**Difficulty:** medium

## OCR09 — Why can OCR errors cause cascading failures in a RAG pipeline?

**Expected answer:** An OCR error can corrupt the knowledge base, which can cause the retriever to select poor evidence and leave the language model with incomplete or incorrect context for generation.

**Relevant page:** 9  
**Difficulty:** medium

## OCR10 — What alternative to OCR does the study discuss for document understanding?

**Expected answer:** The study discusses Vision-Language Models as a possible alternative or complement to OCR, and reports that combining visual input with OCR text is a promising direction.

**Relevant page:** 10  
**Difficulty:** medium

## MOB01 — Who participated in the mobile learning study?

**Expected answer:** The study involved 20 Polish university students studying English philology.

**Relevant page:** 1  
**Difficulty:** easy

## MOB02 — How was data collected from the participants?

**Expected answer:** Data were collected through semi-structured interviews and analyzed using qualitative and quantitative approaches.

**Relevant page:** 1  
**Difficulty:** easy

## MOB03 — How does the study describe learner autonomy?

**Expected answer:** Learner autonomy is described as the ability to take charge of one's own learning and is associated with decision-making, critical reflection, independent action, and control over learning.

**Relevant page:** 2  
**Difficulty:** medium

## MOB04 — What were the main reasons participants gave for using mobile devices?

**Expected answer:** They valued mobile devices because they were convenient, fast, readily available, provided quick internet access, and helped them organize and access study materials.

**Relevant page:** 5  
**Difficulty:** easy

## MOB05 — Which mobile applications or resources were commonly used?

**Expected answer:** Examples included online dictionaries, Google Translate, Duolingo, Fiszkoteka, Voscreen, WhatsApp, TED, online newspapers, YouTube, 6 Minute English, PONS, and downloaded PDF materials.

**Relevant page:** 6  
**Difficulty:** medium

## MOB06 — Where did participants use mobile devices most frequently for English learning?

**Expected answer:** Thirteen participants (65%) used them most frequently during leisure time, six (30%) primarily in the classroom, and one reported equal use in both settings.

**Relevant page:** 7  
**Difficulty:** easy

## MOB07 — What proportion of participants associated mobile devices primarily with informal learning?

**Expected answer:** Thirteen participants, or 65%, associated mobile device use primarily with informal English learning.

**Relevant page:** 8  
**Difficulty:** easy

## MOB08 — What language area did all participants practice using mobile devices?

**Expected answer:** All participants reported using mobile devices to practice English vocabulary.

**Relevant page:** 9  
**Difficulty:** easy

## MOB09 — How many participants believed mobile devices helped them study more or learn more effectively?

**Expected answer:** Fifteen participants, or 75%, believed mobile devices encouraged them to study English more or helped them learn more effectively or efficiently.

**Relevant page:** 10  
**Difficulty:** easy

## MOB10 — What limitation did the study identify regarding the generalizability of its findings?

**Expected answer:** The small and relatively homogeneous participant group limits how broadly the findings can be generalized.

**Relevant page:** 10  
**Difficulty:** medium

