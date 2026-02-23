---
name: composio
description: Use Composio to connect AI agents with 1000+ external apps (GitHub, Slack, Gmail, etc.)
metadata:
  {
    "openclaw":
      {
        "emoji": "🔗",
        "requires": { "bins": ["/home/paj/.openclaw/workspace/venv/bin/composio"] },
      },
  }
---

# Composio Skill

This skill allows the agent to interact with the Composio platform to manage toolsets, integrations, and execute actions across 1000+ external applications.

## Core Capabilities
1. **Connect Apps:** Link external accounts (GitHub, Slack, etc.) to your AI workspace.
2. **Execute Actions:** Perform complex tasks like "Send a Slack message", "Create a GitHub PR", or "Search emails".
3. **Trigger Management:** Set up automation based on external events.

## Usage Guide

### 1. Account Management
To check who you are logged in as or to login:
- `composio whoami`
- `composio login` (Requires interactive flow)

### 2. Managing Integrations
List available apps or add a new one:
- `composio apps`
- `composio add github` (To connect GitHub)
- `composio connections` (To list active connections)

### 3. Executing Actions
To find and run actions:
- `composio actions list --app github`
- `composio execute --action github_create_issue --params '{"owner": "...", "repo": "...", "title": "..."}'`

## Command Reference
Always use the full path to the executable if running in a script:
`/home/paj/.openclaw/workspace/venv/bin/composio [command]`

## Example Workflow (Send a Slack Message)
1. List connections: `composio connections`
2. Search for Slack actions: `composio actions list --app slack`
3. Execute: `composio execute --action slack_chat_post_message --params '{"channel": "general", "text": "Hello from OpenClaw!"}'`
