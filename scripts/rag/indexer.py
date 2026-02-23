import os
import glob
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# Konfiguration
BASE_PATH = "/home/paj/.openclaw/workspace/infra"
DB_PATH = "/home/paj/.openclaw/workspace/chroma_db"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def index_documents():
    print(f"--- Strike First! Full indexering påbörjad i {BASE_PATH} ---")
    
    # 1. Hitta alla PDF-filer i alla undermappar
    pdf_files = glob.glob(os.path.join(BASE_PATH, "**/*.pdf"), recursive=True)
    if not pdf_files:
        print(f"Inga PDF-filer hittades i {BASE_PATH}. Cobra Kai never dies (men vi behöver data)!")
        return

    all_splits = []
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    for pdf in pdf_files:
        print(f"Tuggar igenom: {pdf.replace(BASE_PATH, '')}...")
        try:
            loader = PyPDFLoader(pdf)
            docs = loader.load()
            splits = text_splitter.split_documents(docs)
            all_splits.extend(splits)
        except Exception as e:
            print(f"Kunde inte läsa {pdf}: {e}")

    print(f"Totalt antal textblock att processa: {len(all_splits)}")

    # 2. Skapa embeddings och spara i Chroma
    print(f"Skapar lokala embeddings... Pain does not exist in this dojo!")
    
    embeddings = HuggingFaceEmbeddings(model_name=MODEL_NAME)
    
    # Vi skriver över gamla databasen för att vara säkra på att vi har allt
    vectorstore = Chroma.from_documents(
        documents=all_splits,
        embedding=embeddings,
        persist_directory=DB_PATH
    )
    
    print(f"--- QUIET! Full indexering klar. Databas sparad i {DB_PATH} ---")

if __name__ == "__main__":
    index_documents()
