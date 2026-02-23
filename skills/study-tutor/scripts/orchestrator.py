import json
import os
import random

class StudyCatOrchestrator:
    def __init__(self, progress_file="~/study_progress.json"):
        self.progress_file = os.path.expanduser(progress_file)
        self.state = self.load_state()

    def load_state(self):
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r') as f:
                return json.load(f)
        return {"multiplication": {}, "current_session": None}

    def save_state(self):
        with open(self.progress_file, 'w') as f:
            json.dump(self.state, f, indent=2)

    def handle_input(self, user_text):
        # Basic intent detection
        user_text = user_text.lower()
        
        if "tabell" in user_text:
            return self.start_drill(user_text)
        
        if "hur går det" in user_text or "framsteg" in user_text:
            return self.get_progress_summary()
            
        return None # Fallback to LLM for general chat

    def start_drill(self, text):
        # Extract table number
        tables = [int(s) for s in text.split() if s.isdigit()]
        table = tables[0] if tables else random.randint(2, 9)
        
        num = random.randint(1, 10)
        self.state["current_session"] = {"type": "multi", "q": f"{num}*{table}", "a": num*table}
        self.save_state()
        
        return {
            "type": "question",
            "text": f"Okej! Vi kör {table}:ans tabell. Vad blir {num} gånger {table}? 🐾",
            "hint": self.generate_hint(num, table)
        }

    def generate_hint(self, n, t):
        if n == 1: return "Allt gånger 1 blir sig självt!"
        if n == 2: return f"Det är samma sak som {t} + {t}."
        if n == 5: return "Tänk på klockan eller fingrarna, det slutar alltid på 0 eller 5!"
        if n == 10: return f"Sätt bara en nolla efter {t}!"
        return f"Vet du vad {n-1} gånger {t} är? Lägg bara till en {t}:a till det svaret."

    def get_progress_summary(self):
        # logic to summarize progress
        return {"type": "summary", "text": "Du har varit jätteduktig! Vi har tränat på 5:ans och 7:ans tabell idag. 🐟"}

# For integration testing
if __name__ == "__main__":
    cat = StudyCatOrchestrator()
    print(json.dumps(cat.start_drill("7:ans tabell")))
