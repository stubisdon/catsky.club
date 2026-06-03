#!/usr/bin/env bash
# Email deliverability diagnostics script — run on the production server.
# Checks: Ghost email config, Mailgun DNS records (SPF, DKIM), and common issues.
# Output: Markdown report for GitHub Actions job summary or manual inspection.

set -e

report() { printf '%s\n' "$@"; }
warn() { report "⚠️  $*"; }
ok() { report "✅ $*"; }
fail() { report "❌ $*"; }

# --- Find Ghost root ---
GHOST_ROOT="${GHOST_ROOT:-}"
if [ -z "$GHOST_ROOT" ]; then
  for candidate in /var/www/ghost /opt/ghost "$HOME/ghost"; do
    if [ -f "${candidate}/config.production.json" ] || [ -f "${candidate}/current/config.production.json" ]; then
      GHOST_ROOT="$candidate"
      break
    fi
  done
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

report "## Email Deliverability Report"
report ""
report "**Server:** $(hostname -f 2>/dev/null || hostname)"
report "**Date:** $(date -Iseconds 2>/dev/null || date)"
report ""

# --- Ghost config check ---
if [ -z "$GHOST_ROOT" ] || [ ! -d "$GHOST_ROOT" ]; then
  fail "Could not find Ghost install. Set GHOST_ROOT environment variable."
  exit 1
fi

CONFIG="$GHOST_ROOT/config.production.json"
if [ ! -f "$CONFIG" ]; then
  fail "config.production.json not found at $CONFIG"
  exit 1
fi

report "### Ghost Email Configuration"
report ""
report "- **Ghost root:** \`$GHOST_ROOT\`"
report ""

if command -v jq >/dev/null 2>&1; then
  # Check mail section
  if jq -e '.mail' "$CONFIG" >/dev/null 2>&1; then
    MAIL_TRANSPORT=$(jq -r '.mail.transport // "not set"' "$CONFIG")
    MAIL_FROM=$(jq -r '.mail.from // "not set"' "$CONFIG")
    SMTP_HOST=$(jq -r '.mail.options.host // "not set"' "$CONFIG")
    SMTP_USER=$(jq -r '.mail.options.auth.user // "not set"' "$CONFIG")
    
    report "- **Transport:** \`$MAIL_TRANSPORT\`"
    report "- **From address:** \`$MAIL_FROM\`"
    report "- **SMTP host:** \`$SMTP_HOST\`"
    report "- **SMTP user:** \`$SMTP_USER\`"
    report ""
    
    # Check for common issues
    if echo "$MAIL_FROM" | grep -qi "gmail.com"; then
      fail "**From address uses gmail.com** — This will cause spam issues when sending via Mailgun/external SMTP."
      report "   Change the 'from' address to use your own domain (e.g., hello@catsky.club)."
      report ""
    fi
    
    if echo "$MAIL_FROM" | grep -qE '[A-Z]'; then
      warn "**From address has uppercase letters** — Some mail servers are case-sensitive. Use lowercase."
      report ""
    fi
    
    # Extract domain from SMTP user for DNS checks
    if [ "$SMTP_USER" != "not set" ]; then
      MAIL_DOMAIN=$(echo "$SMTP_USER" | sed 's/.*@//')
    else
      MAIL_DOMAIN=""
    fi
  else
    fail "No 'mail' section in config.production.json"
    report "   Magic links and transactional emails will fail. Add a mail block."
    report ""
    MAIL_DOMAIN=""
  fi
else
  warn "jq not installed. Install jq for detailed config analysis."
  if grep -q '"mail"' "$CONFIG" 2>/dev/null; then
    ok "Mail section present in config (install jq for details)."
  else
    fail "No mail section found in config."
  fi
  report ""
  MAIL_DOMAIN=""
fi

# --- DNS record checks ---
report "### DNS Authentication Records"
report ""

# Use the domain from SMTP user, or default to catsky.club variants
DOMAINS_TO_CHECK="${MAIL_DOMAIN:-mail.catsky.club} catsky.club"

for DOMAIN in $DOMAINS_TO_CHECK; do
  report "#### Domain: \`$DOMAIN\`"
  report ""
  
  # Check SPF
  if command -v dig >/dev/null 2>&1; then
    SPF=$(dig +short TXT "$DOMAIN" 2>/dev/null | grep -i "v=spf1" || true)
    if [ -n "$SPF" ]; then
      ok "SPF record found:"
      report "   \`$SPF\`"
      if echo "$SPF" | grep -qi "mailgun"; then
        ok "SPF includes Mailgun"
      else
        warn "SPF may not include Mailgun. Check if include:mailgun.org is present."
      fi
    else
      fail "No SPF record found for $DOMAIN"
      report "   Add a TXT record: \`v=spf1 include:mailgun.org ~all\`"
    fi
    report ""
    
    # Check DKIM (common Mailgun selectors)
    for selector in smtp mailo mta1 pic; do
      DKIM_DOMAIN="${selector}._domainkey.${DOMAIN}"
      DKIM=$(dig +short TXT "$DKIM_DOMAIN" 2>/dev/null | head -1 || true)
      if [ -n "$DKIM" ]; then
        ok "DKIM record found for selector '$selector'"
        break
      fi
    done
    if [ -z "$DKIM" ]; then
      # Try the k= format check
      DKIM=$(dig +short TXT "k1._domainkey.${DOMAIN}" 2>/dev/null | head -1 || true)
      if [ -n "$DKIM" ]; then
        ok "DKIM record found for selector 'k1'"
      else
        warn "No common DKIM selectors found for $DOMAIN"
        report "   Check Mailgun dashboard for the correct DKIM records to add."
      fi
    fi
    report ""
    
    # Check DMARC
    DMARC=$(dig +short TXT "_dmarc.${DOMAIN}" 2>/dev/null | grep -i "v=DMARC1" || true)
    if [ -n "$DMARC" ]; then
      ok "DMARC record found:"
      report "   \`$DMARC\`"
    else
      warn "No DMARC record found for $DOMAIN (optional but recommended)"
      report "   Consider adding: \`v=DMARC1; p=none; rua=mailto:dmarc@$DOMAIN\`"
    fi
    report ""
  else
    warn "dig not installed. Cannot check DNS records."
    report "   Install dnsutils/bind-utils to enable DNS checks."
    report ""
  fi
done

# --- Recommendations ---
report "### Recommendations"
report ""
report "1. **Use a custom domain email** — Set the 'from' address in Ghost config to use your domain (e.g., \`hello@catsky.club\`), not Gmail."
report "2. **Verify Mailgun domain** — In Mailgun dashboard, ensure all DNS records (SPF, DKIM) show as verified."
report "3. **Wait for DNS propagation** — After adding DNS records, wait up to 48 hours for full propagation."
report "4. **Test with Mail Tester** — Send a test email to [mail-tester.com](https://www.mail-tester.com/) for a detailed spam score report."
report "5. **Check Gmail headers** — In Gmail, click 'Show original' on a received email to see SPF/DKIM/DMARC pass/fail status."
report ""

report "---"
report "*Run this script on the server: \`./scripts/check-email-deliverability.sh\`*"
