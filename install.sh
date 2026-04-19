#!/bin/bash
# Orbit — install LaunchAgents and register MCP server

set -e

echo "=== Orbit Setup ==="

# 1. Unload old agents if they exist
launchctl bootout gui/$(id -u)/com.cloud.lp-stale-check 2>/dev/null || true
launchctl bootout gui/$(id -u)/com.cloud.lp-weekly-summary 2>/dev/null || true
launchctl bootout gui/$(id -u)/com.cloud.orbit-stale-check 2>/dev/null || true
launchctl bootout gui/$(id -u)/com.cloud.orbit-weekly-summary 2>/dev/null || true

# Clean up old plist files
rm -f ~/Library/LaunchAgents/com.cloud.lp-stale-check.plist
rm -f ~/Library/LaunchAgents/com.cloud.lp-weekly-summary.plist

# 2. Install LaunchAgents
echo "Installing LaunchAgents..."
cp ~/Ship/ce/orbit/com.cloud.orbit-stale-check.plist ~/Library/LaunchAgents/
cp ~/Ship/ce/orbit/com.cloud.orbit-weekly-summary.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cloud.orbit-stale-check.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cloud.orbit-weekly-summary.plist
echo "  Daily stale pipeline check: 9:00 AM"
echo "  Weekly pipeline summary: Mondays 8:00 AM"

# 3. Register MCP server in .claude.json as "orbit"
echo "Registering Orbit MCP server..."
python3 -c "
import json, os
f = '/Users/jerryshi/.claude.json'
d = json.load(open(f))
servers = d['projects']['/Users/jerryshi']['mcpServers']
# Remove old lp-crm key if exists
servers.pop('lp-crm', None)
# Remove existing orbit key to avoid dup on re-run
servers.pop('orbit', None)
servers['orbit'] = {
    'command': 'npx',
    'args': ['tsx', '/Users/jerryshi/Ship/ce/orbit/src/mcp/orbit-server.ts'],
    'env': {'DATABASE_URL': os.environ.get('DATABASE_URL', '')}
}
json.dump(d, open(f, 'w'), indent=2)
print('  Orbit MCP server registered')
"

# 4. Create logs dir
mkdir -p ~/Ship/ce/orbit/logs

echo ""
echo "=== Done ==="
echo "Restart Claude Code for the MCP server to take effect."
echo "Test: message Cloud on TG with 'Orbit pipeline status'"
