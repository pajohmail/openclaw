import { createSubsystemLogger } from "../../logging/subsystem.js";
import type { SkillInstallSpec } from "./types.js";

const log = createSubsystemLogger("skills/security");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SecuritySeverity = "critical" | "warning" | "info";
export type SecurityVerdict = "pass" | "warn" | "block";
export type SecurityLevel = "strict" | "normal" | "off";

export type SecurityFinding = {
  severity: SecuritySeverity;
  ruleId: string;
  description: string;
  matchedText: string;
  lineNumber: number;
};

export type SkillSecurityResult = {
  skillName: string;
  verdict: SecurityVerdict;
  findings: SecurityFinding[];
};

// ---------------------------------------------------------------------------
// Rule definition
// ---------------------------------------------------------------------------

type SecurityRule = {
  id: string;
  severity: SecuritySeverity;
  description: string;
  pattern: RegExp;
  /** If true, test against full content instead of line-by-line. */
  multiline?: boolean;
  /** Return true if the match is genuinely suspicious (reduces false positives). */
  contextCheck?: (match: string, line: string) => boolean;
};

// ---------------------------------------------------------------------------
// URL constants
// ---------------------------------------------------------------------------

const SAFE_DOWNLOAD_HOSTS = new Set([
  "github.com",
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "releases.githubusercontent.com",
  "registry.npmjs.org",
  "www.npmjs.com",
  "pypi.org",
  "files.pythonhosted.org",
  "proxy.golang.org",
  "crates.io",
  "static.crates.io",
  "brew.sh",
  "formulae.brew.sh",
  "dl.google.com",
  "storage.googleapis.com",
]);

const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "is.gd",
  "ow.ly",
  "buff.ly",
  "rb.gy",
  "cutt.ly",
  "shorturl.at",
]);

const SUSPICIOUS_TLDS = new Set([".tk", ".ml", ".cf", ".ga", ".gq"]);

// ---------------------------------------------------------------------------
// Content rules
// ---------------------------------------------------------------------------

const CONTENT_RULES: SecurityRule[] = [
  // --- Category A: Shell injection / pipe-to-exec ---
  {
    id: "shell-curl-pipe-exec",
    severity: "critical",
    description: "curl output piped to shell interpreter",
    pattern: /curl\s[^|]*\|\s*(ba)?sh\b/i,
  },
  {
    id: "shell-wget-pipe-exec",
    severity: "critical",
    description: "wget output piped to shell interpreter",
    pattern: /wget\s[^|]*\|\s*(ba)?sh\b/i,
  },
  {
    id: "shell-pipe-exec-generic",
    severity: "critical",
    description: "Remote content piped to shell interpreter",
    pattern: /\|\s*(ba)?sh\s+-s\b/i,
  },

  // --- Category B: Code execution ---
  {
    id: "code-eval-fn",
    severity: "critical",
    description: "JavaScript eval() call",
    pattern: /\beval\s*\(/,
    contextCheck: (_match, line) => {
      // Skip lines that discuss avoiding eval (documentation)
      const lower = line.toLowerCase();
      return !lower.includes("avoid") && !lower.includes("don't use") && !lower.includes("never");
    },
  },
  {
    id: "code-new-function",
    severity: "critical",
    description: "Dynamic Function constructor",
    pattern: /\bnew\s+Function\s*\(/,
  },

  // --- Category C: Data exfiltration ---
  {
    id: "exfil-curl-post",
    severity: "critical",
    description: "curl sending data to external endpoint",
    pattern: /curl\s+.*(-d\s|--data\b|--data-binary\b|--data-urlencode\b|--upload-file\b)/i,
    contextCheck: (_match, line) => {
      // Allow if posting to well-known APIs (localhost, etc.)
      const lower = line.toLowerCase();
      return !lower.includes("localhost") && !lower.includes("127.0.0.1");
    },
  },
  {
    id: "exfil-wget-post",
    severity: "critical",
    description: "wget POST sending data",
    pattern: /wget\s+.*--post-(data|file)\b/i,
  },
  {
    id: "exfil-send-secrets",
    severity: "critical",
    description: "Sending environment secrets to external endpoint",
    pattern: /(curl|wget|nc|ncat)\s.*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CRED)/i,
  },

  // --- Category D: Credential harvesting ---
  {
    id: "cred-ssh-access",
    severity: "warning",
    description: "Accessing SSH directory",
    pattern: /(~|\$HOME)\/\.ssh\//,
  },
  {
    id: "cred-aws-access",
    severity: "warning",
    description: "Accessing AWS credentials",
    pattern: /(~|\$HOME)\/\.aws\//,
  },
  {
    id: "cred-env-file-read",
    severity: "warning",
    description: "Reading .env file",
    pattern: /\b(cat|source|\.)\s+.*\.env\b/,
    contextCheck: (_match, line) => {
      // Skip lines about creating or writing .env files
      const lower = line.toLowerCase();
      return !lower.includes("create") && !lower.includes("write") && !lower.includes("echo");
    },
  },
  {
    id: "cred-sensitive-file-read",
    severity: "warning",
    description: "Reading sensitive credential files",
    pattern: /\b(cat|read|source)\s+.*(\.npmrc|\.netrc|\.gitcredentials|credentials\.json)\b/i,
  },

  // --- Category E: Obfuscation ---
  {
    id: "obfuscation-base64-long",
    severity: "critical",
    description: "Suspiciously long base64-encoded string",
    pattern: /[A-Za-z0-9+/=]{120,}/,
    contextCheck: (match, _line) => {
      // Skip if it looks like a URL or hash
      if (match.startsWith("http")) return false;
      // Skip if it's mostly alphanumeric without +/= (could be a long word/path)
      const b64Chars = (match.match(/[+/=]/g) || []).length;
      return b64Chars > 2;
    },
  },
  {
    id: "obfuscation-hex-payload",
    severity: "critical",
    description: "Hex-encoded payload",
    pattern: /(\\x[0-9a-fA-F]{2}){10,}/,
  },
  {
    id: "obfuscation-base64-decode-exec",
    severity: "critical",
    description: "Base64 decoding piped to execution",
    pattern: /base64\s+(-d|--decode)\s*\|/i,
  },

  // --- Category F: Filesystem attacks ---
  {
    id: "fs-rm-rf-root",
    severity: "critical",
    description: "Recursive delete of root or home directory",
    pattern: /rm\s+-[rR]f\s+(\/[^\s/]*\s|\/\s|~\/|~\s|\$HOME)/,
  },
  {
    id: "fs-chmod-777",
    severity: "warning",
    description: "Setting world-writable permissions",
    pattern: /chmod\s+777\b/,
  },
  {
    id: "fs-write-system-dir",
    severity: "critical",
    description: "Writing to system directories",
    pattern: /(>\s*|tee\s+)(\/etc\/|\/usr\/)/,
  },

  // --- Category G: Network attacks ---
  {
    id: "net-reverse-shell",
    severity: "critical",
    description: "Reverse shell pattern detected",
    pattern: /(\/dev\/tcp\/|bash\s+-i\s+>&|nc\s+-[elp]|ncat\s+-[elp])/,
  },
  {
    id: "net-port-scan",
    severity: "warning",
    description: "Port scanning tool reference",
    pattern: /\bnmap\s+-/,
  },

  // --- Category H: Privilege escalation ---
  {
    id: "priv-sudo-suspicious",
    severity: "warning",
    description: "Use of sudo outside install context",
    pattern: /\bsudo\b/,
    contextCheck: (_match, line) => {
      // Allow sudo for package managers (install-related)
      const lower = line.toLowerCase();
      return (
        !lower.includes("apt") &&
        !lower.includes("apt-get") &&
        !lower.includes("brew") &&
        !lower.includes("npm") &&
        !lower.includes("pip") &&
        !lower.includes("dnf") &&
        !lower.includes("yum") &&
        !lower.includes("pacman") &&
        !lower.includes("install")
      );
    },
  },
  {
    id: "priv-setuid",
    severity: "critical",
    description: "Setting setuid/setgid bit",
    pattern: /\bchmod\s+[ugo]*\+s\b/,
  },
  {
    id: "priv-chown-root",
    severity: "warning",
    description: "Changing ownership to root",
    pattern: /\bchown\s+(root|0:0)\b/,
  },
];

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

function isRawIpAddress(hostname: string): boolean {
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  // IPv6 (bracketed or bare)
  if (hostname.startsWith("[") || hostname.includes(":")) return true;
  return false;
}

export function validateInstallSpecUrls(
  specs: SkillInstallSpec[],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const spec of specs) {
    if (!spec.url) continue;

    let parsed: URL;
    try {
      parsed = new URL(spec.url);
    } catch {
      findings.push({
        severity: "warning",
        ruleId: "url-malformed",
        description: "Malformed URL in install spec",
        matchedText: spec.url.slice(0, 100),
        lineNumber: 0,
      });
      continue;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Non-HTTPS
    if (parsed.protocol === "http:") {
      findings.push({
        severity: "warning",
        ruleId: "url-non-https",
        description: "Insecure HTTP download URL",
        matchedText: spec.url.slice(0, 100),
        lineNumber: 0,
      });
    }

    // Raw IP address
    if (isRawIpAddress(hostname)) {
      findings.push({
        severity: "critical",
        ruleId: "url-raw-ip",
        description: "Download URL uses raw IP address",
        matchedText: spec.url.slice(0, 100),
        lineNumber: 0,
      });
    }

    // URL shortener
    if (URL_SHORTENERS.has(hostname)) {
      findings.push({
        severity: "critical",
        ruleId: "url-shortener",
        description: "Download URL uses URL shortener (possible obfuscation)",
        matchedText: spec.url.slice(0, 100),
        lineNumber: 0,
      });
    }

    // Suspicious TLD
    const tld = hostname.slice(hostname.lastIndexOf("."));
    if (SUSPICIOUS_TLDS.has(tld) && !SAFE_DOWNLOAD_HOSTS.has(hostname)) {
      findings.push({
        severity: "warning",
        ruleId: "url-suspicious-tld",
        description: `Download URL uses suspicious TLD: ${tld}`,
        matchedText: spec.url.slice(0, 100),
        lineNumber: 0,
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Core scanning
// ---------------------------------------------------------------------------

function scanContentForFindings(content: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split("\n");

  for (const rule of CONTENT_RULES) {
    if (rule.multiline) {
      const match = rule.pattern.exec(content);
      if (match) {
        const fullMatch = match[0];
        // Compute approximate line number
        const offset = match.index;
        const lineNumber = content.slice(0, offset).split("\n").length;
        if (!rule.contextCheck || rule.contextCheck(fullMatch, content)) {
          findings.push({
            severity: rule.severity,
            ruleId: rule.id,
            description: rule.description,
            matchedText: fullMatch.slice(0, 100),
            lineNumber,
          });
        }
      }
    } else {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const match = rule.pattern.exec(line);
        if (match) {
          const fullMatch = match[0];
          if (!rule.contextCheck || rule.contextCheck(fullMatch, line)) {
            findings.push({
              severity: rule.severity,
              ruleId: rule.id,
              description: rule.description,
              matchedText: fullMatch.slice(0, 100),
              lineNumber: i + 1,
            });
            // Only report first match per rule per skill (avoid noise)
            break;
          }
        }
      }
    }
  }
  return findings;
}

function computeVerdict(
  findings: SecurityFinding[],
  level: SecurityLevel,
): SecurityVerdict {
  if (findings.length === 0) return "pass";

  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasWarning = findings.some((f) => f.severity === "warning");

  if (hasCritical) return "block";
  if (hasWarning && level === "strict") return "block";
  if (hasWarning) return "warn";
  return "pass";
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export function validateSkillSecurity(params: {
  skillName: string;
  content: string;
  installSpecs?: SkillInstallSpec[];
  level?: SecurityLevel;
}): SkillSecurityResult {
  const level = params.level ?? "normal";

  if (level === "off") {
    return { skillName: params.skillName, verdict: "pass", findings: [] };
  }

  const findings: SecurityFinding[] = [];

  // Scan content
  if (params.content) {
    findings.push(...scanContentForFindings(params.content));
  }

  // Validate install spec URLs
  if (params.installSpecs && params.installSpecs.length > 0) {
    findings.push(...validateInstallSpecUrls(params.installSpecs));
  }

  const verdict = computeVerdict(findings, level);

  if (verdict === "block") {
    try {
      log.warn(
        { skill: params.skillName, findings: findings.length },
        `skill "${params.skillName}" blocked by security scan`,
      );
    } catch {}
  } else if (verdict === "warn") {
    try {
      log.debug(
        { skill: params.skillName, findings: findings.length },
        `skill "${params.skillName}" has security warnings`,
      );
    } catch {}
  }

  return {
    skillName: params.skillName,
    verdict,
    findings,
  };
}
