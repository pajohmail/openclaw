import sys
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

DB_PATH = "/home/paj/.openclaw/workspace/chroma_db"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def test_query(query):
    embeddings = HuggingFaceEmbeddings(model_name=MODEL_NAME)
    vectorstore = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
    
    print(f"Söker efter: {query}")
    results = vectorstore.similarity_search(query, k=3)
    
    for i, doc in enumerate(results):
        print(f"\n--- Resultat {i+1} (Källa: {doc.metadata.get('source')}) ---")
        print(doc.page_content[:500] + "...")

if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "What is Intune?"
    test_query(query)
