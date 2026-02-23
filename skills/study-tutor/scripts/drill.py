#!/usr/bin/env python3
import argparse
import random
import json
import os

PROGRESS_FILE = os.path.expanduser("~/study_progress.json")

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {"multiplication": {}}

def save_progress(progress):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def start_drill(table):
    num = random.randint(1, 10)
    question = f"{num} * {table}"
    answer = num * table
    
    # Return as JSON for the agent to parse and present
    print(json.dumps({
        "question": question,
        "answer": answer,
        "hint": f"Tänk på att {num-1} * {table} är {(num-1)*table}..." if num > 1 else f"Allt gånger 1 är sig självt!"
    }))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multiplication drill logic.")
    parser.add_argument("--table", type=int, default=random.randint(1, 10))
    args = parser.parse_args()
    
    start_drill(args.table)
