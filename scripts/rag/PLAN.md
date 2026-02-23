# Indexering av Dokumentation (RAG)

## Status
- [x] Dokumentation flyttad till `/home/paj/.openclaw/workspace/infra/win11`.
- [x] Node.js bibliotek för RAG installerade.
- [x] Python-miljö (LangChain) installerad och testad.
- [x] Lokala embeddings konfigurerade (`all-MiniLM-L6-v2`).
- [x] **Första indexeringen klar!** (21 881 textblock sparade i `chroma_db`).
- [x] Gemini Prompting Guide nedladdad till `infra/ai-prompt/`.

## Nästa steg
1. Skapa en OpenClaw Skill `rag-search` för att integrera sökningen i mina svar.
2. Förfina sökningen (lägga till reranking eller bättre chunking vid behov).
3. Börja använda databasen för att svara på Pajs frågor om Intune/Entra.
