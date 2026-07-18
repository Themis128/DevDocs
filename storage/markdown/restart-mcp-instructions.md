# MCP Server Restart Instructions for Cloudless.gr

**Last Updated:** 2026-07-17

## Overview

MCP configuration changes require a full application restart to take effect. This is a manual process that cannot be automated.

## Restart Procedures

### Option 1: VS Code Cline Extension

1. **Save all work** in VS Code
2. **Quit VS Code completely:**
   - Linux: `File → Exit` or `Ctrl+Q` 
   - macOS: `File → Quit` or `Cmd+Q`
   - Windows: `File → Exit` or `Alt+F4`

3. **Wait 5 seconds** for processes to fully terminate

4. **Restart VS Code** from your applications menu

5. **Reopen the cloudless.gr workspace**

6. **Verify MCP connection** - invoke an MCP tool to initialize servers

### Option 2: Claude Desktop

1. **Quit Claude completely:**
   - macOS: `Cmd+Q`
   - Linux/Windows: Right-click tray icon → Quit

2. **Wait 5 seconds** for graceful shutdown

3. **Restart Claude Desktop** from applications menu

4. **Wait for MCP servers to initialize** (check status in menu/interface)

### Option 3: Cline CLI / Background Process

```bash
# Check running Cline processes
ps aux | grep -E 'cline|mcp' | grep -v grep

# Kill gracefully
pkill -TERM -f cline

# Or force kill if needed
pkill -KILL -f cline

# Restart Cline
# (Launch from terminal or application launcher)
```

## MCP Configuration Status

The current configuration at `~/.cline/data/settings/cline_mcp_settings.json` includes:

| Server | Status | Path/Config |
|---------|--------|-------------|
| slack | ✅ Enabled | streamableHttp |
| amazon-s3 | ✅ Enabled | uvx awslabs.aws-api-mcp-server |
| amplitude | ✅ Enabled | streamableHttp |
| github.com/github-mcp-server | ✅ Enabled | Docker container |
| microsoft-docs | ✅ Enabled | mcp-remote |
| **fast-markdown** | ✅ Enabled | `~/.local/bin/fast-markdown-mcp` |

### Fast-Markdown MCP Configuration

```json
{
  "mcpServers": {
    "fast-markdown": {
      "command": "/home/tbaltzakis/.local/bin/fast-markdown-mcp",
      "args": ["/home/tbaltzakis/DevDocs/storage/markdown"],
      "disabled": false,
      "alwaysAllow": ["sync_file", "list_files", "read_file", "search_files", "get_stats"]
    }
  }
}
```

## After Restart - Verification

Once restarted, test the MCP connection:

```bash
# Ask Cline to run these commands:
mcp DevDocs list_files
mcp DevDocs read_file cloudless-architecture.md
mcp DevDocs search_files "MCP"
```

## Why Restart is Required

- MCP servers are loaded into the application process at startup
- Configuration changes are not hot-reloaded
- The `fast-markdown-mcp` server needs to establish stdin/stdout pipes on initialization
- Some servers (like GitHub MCP) spawn child processes that require clean startup

## Troubleshooting

**If MCP tools appear unavailable after restart:**
1. Check VS Code output panel: `View → Output → Cline MCP`
2. Verify the executable exists: `ls -la ~/.local/bin/fast-markdown-mcp`
3. Check file permissions: `chmod +x ~/.local/bin/fast-markdown-mcp` if needed
4. Review logs in VS Code Developer Tools: `Help → Toggle Developer Tools`

**If DevDocs path is incorrect:**
- The storage path is: `/home/tbaltzakis/DevDocs/storage/markdown/`
- Ensure this directory exists and contains `.md` files

## Related Documentation

- [MCP Integration Guide](./devdocs-mcp-integration.md)
- [Troubleshooting Guide](./troubleshooting-guide.md)
- [Migration Completion Status](./migration-completion.md)