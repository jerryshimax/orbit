#!/bin/bash
# Orbit — install LaunchAgents and register MCP server

set -e

echo "=== Orbit CRM Setup ==="

# 1. Unload old agents if they exist
launchctl unload ~/Library/LaunchAgents/com.cloud.lp-stale-check.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/com.cloud.lp-weekly-summary.plist 2>/dev/null || true

# 2. Install LaunchAgents
echo "Installing LaunchAgents..."
cp ~/Ship/ce/lp-crm/com.cloud.lp-stale-check.plist ~/Library/LaunchAgents/
cp ~/Ship/ce/lp-crm/com.cloud.lp-weekly-summary.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.cloud.lp-stale-check.plist
launchctl load ~/Library/LaunchAgents/com.cloud.lp-weekly-summary.plist
echo "  Daily stale LP check: 9:00 AM"
echo "  Weekly pipeline summary: Mondays 8:00 AM"

# 3. Register MCP server in .claude.json as "orbit"
echo "Registering Orbit MCP server..."
python3 -c "
import json
f = '/Users/jerryshi/.claude.json'
d = json.load(open(f))
servers = d['projects']['/Users/jerryshi']['mcpServers']
# Remove old lp-crm if exists
servers.pop('lp-crm', None)
# Add orbit
servers['orbit'] = {
    'command': 'npx',
    'args': ['tsx', '/Users/jerryshi/Ship/ce/lp-crm/src/mcp/lp-crm-server.ts'],
    'env': {'DATABASE_URL': 'postgresql://jerryshi@localhost:5432/lp_crm'}
}
json.dump(d, open(f, 'w'), indent=2)
print('  Orbit MCP server registered (replaced lp-crm)')
"

# 4. Create logs dir
mkdir -p ~/Ship/ce/lp-crm/logs

echo ""
echo "=== Done ==="
echo "Restart Claude Code for the MCP server to take effect."
echo "Test: message Cloud on TG with 'LP status'"
