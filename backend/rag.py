"""
This file contains the "brain" of the app: turning PDFs into a searchable
vector store, and building the conversational chain that answers questions.

Nothing in this file knows about Streamlit OR FastAPI. It's pure logic.
That's on purpose — it makes it reusable and easy to test.
"""

import os
from dotenv import load_dotenv
from pypdf import PdfReader

from langchain_text_splitters import CharacterTextSplitter
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


def get_pdf_text(pdf_files):
    """pdf_files: a list of file-like objects (anything PdfReader can open)."""
    text = ""

    for pdf_file in pdf_files:
        reader = PdfReader(pdf_file)

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                text += page_text

    return text


def get_text_chunks(text):
    splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )

    return splitter.split_text(text)


def get_vector_store(text_chunks):
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    return FAISS.from_texts(
        texts=text_chunks,
        embedding=embeddings,
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

    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vector_store.as_retriever(),
        memory=memory,
        combine_docs_chain_kwargs={"prompt": prompt},
        verbose=True,
    )
