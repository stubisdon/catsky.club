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
report ""

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
