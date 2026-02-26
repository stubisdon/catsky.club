#!/usr/bin/env bash
# Ghost diagnostics script — run on the production server (e.g. via CI).
# Checks: Ghost install path, config.production.json mail section, process status, recent errors in logs.
# Output: Markdown report for GitHub Actions job summary or manual inspection.

set -e

report() { printf '%s\n' "$@"; }

# --- Find Ghost root ---
GHOST_ROOT="${GHOST_ROOT:-}"
if [ -z "$GHOST_ROOT" ]; then
  for candidate in /var/www/ghost /opt/ghost "$HOME/ghost"; do
    if [ -f "${candidate}/config.production.json" ] || [ -f "${candidate}/current/config.production.json" ]; then
      GHOST_ROOT="$candidate"
      break
    fi
  done
  # Broader search if not found (Ghost may be in e.g. /var/www/catsky.club, /home/ubuntu/ghost)
  if [ -z "$GHOST_ROOT" ] && command -v find >/dev/null 2>&1; then
    FOUND=""
    for base in /var/www /opt /home; do
      [ ! -d "$base" ] && continue
      FOUND=$(find "$base" -maxdepth 5 -name "config.production.json" -type f 2>/dev/null | head -1)
      [ -n "$FOUND" ] && break
    done
    if [ -n "$FOUND" ]; then
      GHOST_ROOT="$(dirname "$FOUND")"
    fi
  fi
  if [ -n "$GHOST_ROOT" ] && [ -d "$GHOST_ROOT/current" ] && [ -f "$GHOST_ROOT/current/config.production.json" ]; then
    GHOST_ROOT="$GHOST_ROOT/current"
  fi
fi

report "## Ghost diagnostics report"
report ""
report "**Server:** $(hostname -f 2>/dev/null || hostname)"
report "**Date:** $(date -Iseconds 2>/dev/null || date)"
report ""

# --- CVE-2026-26980 vulnerability check ---
check_cve_2026_26980() {
  local version="$1"
  if [ -z "$version" ]; then
    return 1
  fi
  
  # Extract major.minor.patch
  local major minor patch
  major=$(echo "$version" | cut -d. -f1)
  minor=$(echo "$version" | cut -d. -f2)
  patch=$(echo "$version" | cut -d. -f3)
  
  # Vulnerable: 3.24.0 through 6.19.0
  # Safe: < 3.24.0 or >= 6.19.1
  
  # If major < 3, safe (unlikely but handle it)
  if [ "$major" -lt 3 ]; then
    return 1
  fi
  
  # If major == 3 and minor < 24, safe
  if [ "$major" -eq 3 ] && [ "$minor" -lt 24 ]; then
    return 1
  fi
  
  # If major > 6, safe (future version)
  if [ "$major" -gt 6 ]; then
    return 1
  fi
  
  # If major == 6 and minor > 19, safe
  if [ "$major" -eq 6 ] && [ "$minor" -gt 19 ]; then
    return 1
  fi
  
  # If major == 6 and minor == 19 and patch >= 1, safe
  if [ "$major" -eq 6 ] && [ "$minor" -eq 19 ] && [ "$patch" -ge 1 ]; then
    return 1
  fi
  
  # Otherwise vulnerable
  return 0
}

if [ -z "$GHOST_ROOT" ] || [ ! -d "$GHOST_ROOT" ]; then
  report "### Ghost install"
  report ""
  report "❌ Could not find Ghost install. Searched: /var/www/ghost, /opt/ghost, \$HOME/ghost, and find /var/www /opt /home for config.production.json."
  report ""
  report "**Next step:** On the server, run: find / -name config.production.json 2>/dev/null . Then set GHOST_ROOT to that directory (or its parent if inside current/) and re-run, or add the path to the script."
  report ""
  exit 0
fi

report "### Ghost install"
report ""
report "- **Path:** \`$GHOST_ROOT\`"

# Try to get Ghost version
GHOST_VERSION=""
if [ -f "$GHOST_ROOT/package.json" ]; then
  if command -v jq >/dev/null 2>&1; then
    GHOST_VERSION=$(jq -r '.version // empty' "$GHOST_ROOT/package.json" 2>/dev/null || true)
  else
    GHOST_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$GHOST_ROOT/package.json" 2>/dev/null | head -1 | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || true)
  fi
fi
if [ -z "$GHOST_VERSION" ] && command -v ghost >/dev/null 2>&1; then
  GHOST_VERSION=$(cd "$GHOST_ROOT" && ghost version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 || true)
fi

if [ -n "$GHOST_VERSION" ]; then
  report "- **Version:** \`$GHOST_VERSION\`"
fi
report ""

# --- Security vulnerability check ---
report "### Security vulnerabilities"
report ""

if [ -n "$GHOST_VERSION" ]; then
  if check_cve_2026_26980 "$GHOST_VERSION"; then
    report "🚨 **CRITICAL: CVE-2026-26980 - SQL Injection Vulnerability**"
    report ""
    report "Your Ghost version ($GHOST_VERSION) is vulnerable to a critical SQL injection attack."
    report "- **Affected versions:** 3.24.0 through 6.19.0"
    report "- **Patched version:** 6.19.1+"
    report "- **CVSS Score:** 9.4 (Critical)"
    report "- **Impact:** Unauthenticated attackers can read arbitrary data from the database"
    report ""
    report "**Immediate action required:**"
    report "1. Apply WAF mitigation (block requests with \`slug:[..]\` in query string)"
    report "2. Update Ghost to version 6.19.1 or later: \`ghost update\`"
    report ""
  else
    report "✅ **CVE-2026-26980:** Not vulnerable (version $GHOST_VERSION)"
    report ""
  fi
else
  report "⚠️ Could not determine Ghost version. Manual CVE-2026-26980 check required."
  report "   Run \`ghost version\` and verify version is 6.19.1 or later."
  report ""
fi

# --- Config and mail ---
CONFIG="$GHOST_ROOT/config.production.json"
if [ ! -f "$CONFIG" ]; then
  report "### Config"
  report ""
  report "❌ \`config.production.json\` not found at \`$CONFIG\`."
  report ""
else
  report "### Config (\`config.production.json\`)"
  report ""
  if command -v jq >/dev/null 2>&1; then
    if jq -e '.mail' "$CONFIG" >/dev/null 2>&1; then
      MAIL_TRANSPORT=$(jq -r '.mail.transport // "not set"' "$CONFIG")
      report "- **Mail transport:** \`$MAIL_TRANSPORT\`"
      if [ "$MAIL_TRANSPORT" = "SMTP" ] && jq -e '.mail.options.host' "$CONFIG" >/dev/null 2>&1; then
        report "- **SMTP host:** \`$(jq -r '.mail.options.host' "$CONFIG")\`"
        report "- **Mail section:** present and looks configured."
      else
        report "- **Mail section:** present; check \`mail.options\` (host, auth) if magic links fail."
      fi
    else
      report "❌ **Mail:** No \`mail\` section in config. Magic links and transactional email will fail (often 500)."
      report "   Add a \`mail\` block with \`transport\` and \`options\` (see DEPLOYMENT.md)."
    fi
  else
    if grep -q '"mail"' "$CONFIG" 2>/dev/null; then
      report "- **Mail:** \`mail\` section present (install \`jq\` on the server for more detail)."
    else
      report "❌ **Mail:** No \`mail\` section found in config. Add one for magic link / transactional email."
    fi
  fi
  report ""
fi

# --- Process status ---
report "### Process status"
report ""
if command -v ghost >/dev/null 2>&1; then
  if (cd "$GHOST_ROOT" && ghost status 2>/dev/null); then
    :
  else
    report "⚠️ \`ghost status\` failed or Ghost not running via Ghost-CLI."
  fi
else
  if pgrep -f "ghost" >/dev/null 2>&1 || pgrep -f "current/index.js" >/dev/null 2>&1; then
    report "Ghost-related process(es) found (ghost CLI not in PATH for full status)."
  else
    report "⚠️ No Ghost process detected; \`ghost\` CLI not in PATH."
  fi
fi
report ""

# --- Recent log errors ---
report "### Recent log errors (last 30 lines with error/fail/500)"
report ""
LOG_DIR="$GHOST_ROOT/content/logs"
if [ -d "$LOG_DIR" ]; then
  ERR=$(tail -n 500 "$LOG_DIR"/*.log 2>/dev/null | grep -iE "error|fail|500|exception" | tail -n 30 || true)
  if [ -n "$ERR" ]; then
    report '```'
    report "$ERR"
    report '```'
  else
    report "No recent error lines found in \`$LOG_DIR\`."
  fi
else
  report "Log directory not found: \`$LOG_DIR\`."
fi
report ""
report "---"
report "*Run this script on the server or via CI (see \`.github/workflows/check-ghost.yml\`).*"
