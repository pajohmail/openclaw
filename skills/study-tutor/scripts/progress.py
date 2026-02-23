#!/usr/bin/env python3
import json
import os

PROGRESS_FILE = os.path.expanduser("~/study_progress.json")

def show_progress():
    if not os.path.exists(PROGRESS_FILE):
        print("Ingen historik hittades än. Kom igen, nu börjar vi plugga! 🐱")
        return

    with open(PROGRESS_FILE, 'r') as f:
        data = json.load(f)
        
    print("# Studie-framsteg 📈")
    for table, score in data.get("multiplication", {}).items():
        print(f"- Tabell {table}: {score} rätt svar")

if __name__ == "__main__":
    show_progress()
