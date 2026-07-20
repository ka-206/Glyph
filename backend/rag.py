
# rag.py
import os,re
from io import BytesIO
from dotenv import load_dotenv
import fitz
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_classic.prompts import PromptTemplate
from langchain_classic.memory import ConversationBufferMemory
from langchain_classic.chains import ConversationalRetrievalChain
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq

load_dotenv()
GROQ_API_KEY=os.getenv("GROQ_API_KEY")
GROQ_MODEL=os.getenv("GROQ_MODEL_NAME")

def clean_pdf_text(t):
    t=t.replace("\r\n","\n").replace("\r","\n")
    t=re.sub(r"[ \t]+"," ",t)
    t=re.sub(r"\n{3,}","\n\n",t)
    return "\n".join([x.strip() for x in t.split("\n") if x.strip()])

def get_pdf_text(pdf_files):
    out=""
    for f in pdf_files:
        f.seek(0); b=f.read()
        try: doc=fitz.open(stream=b,filetype="pdf")
        except: 
            try:
                r=PdfReader(BytesIO(b))
                out+="\n".join(p.extract_text() or "" for p in r.pages)
                continue
            except: continue
        for i,p in enumerate(doc):
            txt=clean_pdf_text(p.get_text("text"))
            if txt: out+=f"\n\n--- Page {i+1} ---\n\n{txt}"
    return out.strip()

def get_vector_store(pdf_files):
    splitter=RecursiveCharacterTextSplitter(chunk_size=1400,chunk_overlap=250,separators=["\n\n","\n",". "," ",""])
    docs=[]; metas=[]
    for f in pdf_files:
        f.seek(0); doc=fitz.open(stream=f.read(),filetype="pdf")
        name=getattr(f,"filename",getattr(f,"name","document.pdf"))
        for pno,p in enumerate(doc,1):
            txt=clean_pdf_text(p.get_text("text"))
            for c,ch in enumerate(splitter.split_text(txt),1):
                docs.append(ch); metas.append({"document":name,"page":pno,"chunk":c})
    vs=FAISS.from_texts(docs,HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5",encode_kwargs={"normalize_embeddings":True}),metadatas=metas)
    return vs,len(docs)

def get_conversation_chain(vs):
    mem=ConversationBufferMemory(memory_key="chat_history",return_messages=True,output_key="answer")
    prompt=PromptTemplate(input_variables=["context","chat_history","question"],template="Use only the context. If unknown, say you don't know.\n\nContext:\n{context}\n\nChat History:\n{chat_history}\n\nQuestion:{question}\nAnswer:")
    return ConversationalRetrievalChain.from_llm(
        llm=ChatGroq(groq_api_key=GROQ_API_KEY,model_name=GROQ_MODEL,temperature=0),
        retriever=vs.as_retriever(search_type="mmr",search_kwargs={"k":6,"fetch_k":20}),
        memory=mem,
        combine_docs_chain_kwargs={"prompt":prompt},
        return_source_documents=True,
        verbose=True)
