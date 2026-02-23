---
name: kali-audit
description: Security auditing and network analysis using Kali-inspired CLI tools (nmap, aircrack-ng, etc.)
metadata:
  {
    "openclaw":
      {
        "emoji": "🛡️",
        "requires": { "bins": ["nmap", "mtr", "tcpdump"] },
      },
  }
---

# Kali Audit Skill

This skill provides the assistant with tools to perform security audits, network reconnaissance, and stability testing on the local network.

## Core Capabilities
1. **Network Mapping:** Discover active devices and open ports using `nmap`.
2. **WiFi Analysis:** Monitor and audit wireless security using `aircrack-ng` (requires compatible hardware).
3. **Connectivity Testing:** Analyze network paths and stability using `mtr` and `speedtest-cli`.
4. **Vulnerability Scanning:** Identify web server weaknesses using `nikto`.

## Usage Examples

### 1. Basic Network Scan
Scan the local network for active hosts:
`nmap -sn 192.168.1.0/24`

### 2. Service & Port Audit
Identify services running on a specific target:
`nmap -sV -p- <target_ip>`

### 3. Stability & Latency Check
Track packet loss and latency to a host:
`mtr --report --report-cycles 10 8.8.8.8`

### 4. Web Security Scan
Scan a local web service for known vulnerabilities:
`nikto -h http://localhost:8501`

## Security Analysis Workflow
1. **Inventory:** List all connected devices.
2. **Exposure:** Check for unnecessary open ports on the router and server.
3. **WiFi Strength:** Verify signal levels and encryption standards.
4. **Bandwidth:** Baseline the internet speed to detect anomalies.

---
*Note: Always ensure you have permission to scan targets on the network.*
