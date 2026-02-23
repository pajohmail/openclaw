import sys
import argparse
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

DB_PATH = "/home/paj/.openclaw/workspace/chroma_db"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def query_rag(query, k=5):
    embeddings = HuggingFaceEmbeddings(model_name=MODEL_NAME)
    vectorstore = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
    
    results = vectorstore.similarity_search(query, k=k)
    
    output = []
    for i, doc in enumerate(results):
        source = doc.metadata.get('source', 'unknown')
        content = doc.page_content
        output.append(f"SOURCE: {source}\nCONTENT:\n{content}\n" + "-"*40)
    
    return "\n".join(output)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("query", help="The question to search for in RAG")
    parser.add_argument("--k", type=int, default=5, help="Number of results")
    args = parser.parse_args()
    
    print(query_rag(args.query, args.k))
