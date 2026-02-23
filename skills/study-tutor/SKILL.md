---
name: study-tutor
description: A pedagogical AI tutor for children, focusing on multiplication drills and study summaries.
metadata: { "openclaw": { "emoji": "🐱🎓", "requires": { "python": "3.10+" } } }
---

# Study Tutor Skill

This skill turns the agent into an encouraging study mentor. It handles interactive learning sessions, specifically designed for children.

## Core Capabilities

1. **Multiplication Drills:** Practice multiplication tables in a gamified way.
2. **Study Progress Tracking:** Keeps a log of what has been learned and what needs more practice.
3. **Encouraging Persona:** Uses a friendly, cat-like tone to guide the student.

## Usage Guide

### 1. Start a Multiplication Drill

`/home/paj/.openclaw/workspace/venv/bin/python3 skills/study-tutor/scripts/drill.py --table 7`

### 2. Check Progress

`/home/paj/.openclaw/workspace/venv/bin/python3 skills/study-tutor/scripts/progress.py`

## Implementation Details

The skill uses a local JSON file to store progress data. It follows a "Hint First" pedagogy, where the agent provides clues before giving the final answer.
