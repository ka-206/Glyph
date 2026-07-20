"""
This file contains the "brain" of the app: turning PDFs into a searchable
vector store, and building the conversational chain that answers questions.

Nothing in this file knows about Streamlit OR FastAPI. It's pure logic.
That's on purpose — it makes it reusable and easy to test.
"""

import os
import re
from dotenv import load_dotenv
from pypdf import PdfReader

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_classic.prompts import PromptTemplate
from langchain_classic.memory import ConversationBufferMemory
from langchain_classic.chains import ConversationalRetrievalChain

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
groq_model = os.getenv("GROQ_MODEL_NAME")

if not groq_api_key:
    raise ValueError("GROQ_API_KEY not found in .env")

if not groq_model:
    raise ValueError("GROQ_MODEL_NAME not found in .env")


def clean_pdf_text(text):
    """Clean extracted PDF text and preserve document structure."""
    # Normalize line endings and remove repeated whitespace
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)

    # Preserve paragraphs and headings while collapsing excessive blank lines.
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    # Remove common PDF artifacts like repeated page numbers or headers/footers.
    text = re.sub(r"^\s*Page\s+\d+\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.MULTILINE)

    # Remove any remaining isolated non-word lines that are likely artifacts.
    lines = [line.strip() for line in text.split("\n")]
    filtered_lines = [line for line in lines if len(line) > 1 or line.isalnum()]
    return "\n".join(filtered_lines).strip()


def get_pdf_text(pdf_files):
    """pdf_files: a list of file-like objects (anything PdfReader can open)."""
    text = ""

    for pdf_file in pdf_files:
        reader = PdfReader(pdf_file)

        for page_number, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text()

            if page_text:
                cleaned = clean_pdf_text(page_text)
                if cleaned:
                    text += f"\n\n--- Page {page_number} ---\n\n" + cleaned

    return text.strip()


def get_text_chunks(text):
    splitter = RecursiveCharacterTextSplitter(
        separators=["\n\n", "\n", " ", ""],
        chunk_size=800,
        chunk_overlap=150,
        length_function=len,
    )

    return splitter.split_text(text)


def get_vector_store(text_chunks):
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    metadata = [
        {
            "chunk_id": str(i + 1),
            "source": f"chunk-{i+1}",
        }
        for i in range(len(text_chunks))
    ]

    return FAISS.from_texts(
        texts=text_chunks,
        embedding=embeddings,
        metadatas=metadata,
    )


def get_conversation_chain(vector_store):
    llm = ChatGroq(
        groq_api_key=groq_api_key,
        model_name=groq_model,
        temperature=0,
    )

    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
    )

    template = """
Use the following context and chat history to answer the question.

If you don't know the answer, simply say you don't know.

Context:
{context}

Chat History:
{chat_history}

Question:
{question}

Helpful Answer:
"""

    prompt = PromptTemplate(
        template=template,
        input_variables=[
            "context",
            "chat_history",
            "question",
        ],
    )

    retriever = vector_store.as_retriever(search_kwargs={"k": 4})

    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        combine_docs_chain_kwargs={"prompt": prompt},
        verbose=True,
    )
