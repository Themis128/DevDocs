# DevDocs MCP Integration Guide for Cloudless.gr
*Generated: 2026-07-17 - Updated*

## Overview
How to leverage DevDocs MCP for ongoing documentation management and improvement.

---

## MCP Tools Available (per architecture docs)

| Tool | Purpose | Example Usage |
|------|---------|---------------|
| `sync_file` | Force sync a specific file to DevDocs | Sync after major changes |
| `read_file` | Read content of a markdown file | Read existing docs |
| `list_files` | List all available markdown files | Discover all docs |
| `search_files` | Search content across all markdown files | Find specific info |
| `smart_section_search` | Advanced search with ranking | Find relevant docs |
| `get_table_of_contents` | Get TOC for a markdown file | Navigate long docs |
| `get_section` | Get a specific section from a file | Extract specific info |

---

## Documentation Repository Structure

**Storage path:** `/home/tbaltzakis/DevDocs/storage/markdown/`

### Current Documentation (16 files)
   
 | File | Purpose | Last Updated |
 |------|---------|--------------|
 | `cloudless-architecture.md` | Cluster architecture overview | 2026-07-17 |
 | `cloudless-api-catalog.md` | Complete API endpoint reference | 2026-07-17 |
 | `linkedin-capiphase6-guide.md` | LinkedIn CAPI completion guide | 2026-07-17 |
 | `cluster-operations-runbook.md` | Cluster operations procedures | 2026-07-17 |
 | `troubleshooting-guide.md` | Common issues and fixes | 2026-07-17 |
 | `cloudflare-tunnel-cert-renewal.md` | Certificate renewal procedure | 2026-07-17 |
 | `d1-backup-restore.md` | D1 backup/restore guide | 2026-07-17 |
 | `workers-failover-playbook.md` | Workers failover procedure | 2026-07-17 |
 | `cluster-map-pod-status.md` | Detailed pod status | 2026-07-17 |
 | `analytics-etl-pipeline.md` | Analytics ETL documentation | 2026-07-17 |
 | `stripe-webhook-idempotency-r22.md` | Stripe webhook patterns | 2026-07-17 |
 | `oauth-provider-setup.md` | OAuth configuration guide | 2026-07-17 |
 | `restart-mcp-instructions.md` | MCP restart guide | 2026-07-17 |
 | `mcp-documentation-sprint-summary.md` | Sprint summary | 2026-07-17 |
 | `cloudflare-map.md` | Cloudflare infrastructure map | 2026-07-17 |
 | `auth.md` | Authentication system reference | 2026-07-17 |

---

## Usage Examples

### List All Documentation
```bash
# Via MCP
mcp DevDocs list_files
```

### Search for LinkedIn CAPI Info
```bash
# Via MCP
mcp DevDocs search_files "linkedin.*cap" --format summary
```

### Get Specific Section
```bash
# Via MCP
mcp DevDocs get_section cloudless-api-catalog.md "Authentication Endpoints"
```

### Smart Section Search
```bash
# Find CAPI setup related content
mcp DevDocs smart_section_search "linkedin setup" --threshold 0.7
```

---

## Integration with Existing Tools

### n8n Workflow Documentation
Your `/api/admin/n8n` endpoint can be extended to:
1. Fetch workflow JSON from n8n
2. Generate markdown documentation via `ai/generate`
3. Save to DevDocs via MCP sync_file

### GitHub PR Documentation
Per `todo.txt` line 103: Consider adding to CI pipeline:
```yaml
# .github/workflows/docs-update.yml
- name: Sync docs to DevDocs
  run: |
    # Generate API docs from route comments
    # Sync to DevDocs storage
```

---

## Documentation as Code Workflow

### Pattern for Keeping Docs in Sync

```bash
# 1. After implementing a feature, document it
# Edit appropriate .md file in DevDocs

# 2. Sync to make available via MCP
mcp DevDocs sync_file /home/tbaltzakis/DevDocs/storage/markdown/<new-doc>.md

# 3. Verify search works
mcp DevDocs search_files "<feature-name>"
```

### CI Integration Suggestion

Add to your deployment pipeline:
```bash
# In CI after deploy
pnpm wrangler d1 backup user-auth-db --remote --output=/tmp/d1-backup.sql
# Generate docs for migration
# Update version in CHANGELOG
mcp DevDocs sync_file /home/tbaltzakis/DevDocs/storage/markdown/migration-$(date +%F).md
```

---

## Future Documentation Opportunities

### Using Ollama MCP for Documentation Generation

Your `mcp-ollama-server` can generate docs:

```bash
# Generate code documentation
mcp ollama ollama_generate \
  --prompt "Document the cloudless.gr contact form API with examples" \
  --model qwen2.5-coder
 
# Summarize PR changes
mcp ollama ollama_chat \
  --prompt "Summarize the changes in this codebase diff for release notes"
```

### AI-Powered Documentation Improvements

1. **API Example Generation** - Use Ollama to generate curl examples
2. **Troubleshooting Pattern Mining** - Analyze logs to find common issues
3. **Runbook Automation** - Generate runbooks from incident responses

---

## Quick Start: Adding New Documentation

```bash
#!/bin/bash
# Workflow for adding docs

# 1. Create markdown file
cat > /home/tbaltzakis/DevDocs/storage/markdown/new-feature.md << 'EOF'
# New Feature Title
## Overview
...

## Implementation
...
EOF

# 2. Sync via MCP (when connected)
# mcp DevDocs sync_file /home/tbaltzakis/DevDocs/storage/markdown/new-feature.md

# 3. Verify
# mcp DevDocs search_files "new feature"
```

---

## Documentation Standards

- Use YAML frontmatter for metadata
- Include a "Last Updated" date
- Link to related docs with relative paths
- Use tables for quick reference
- Include code examples with copy-paste blocks
- Document both happy path and error cases

---

## Next Actions

### Completed Documentation
- [x] Added cloudflare-tunnel-cert-renewal.md
- [x] Added d1-backup-restore.md
- [x] Added workers-failover-playbook.md
- [x] Added cluster-map-pod-status.md
- [x] Added analytics-etl-pipeline.md
- [x] Added stripe-webhook-idempotency-r22.md
- [x] Added oauth-provider-setup.md
- [x] Added restart-mcp-instructions.md
- [x] Added mcp-documentation-sprint-summary.md

### Immediate (still needed)
- [ ] Restart Cline to load MCP configuration (per todo.txt line 16)

### Ongoing
- [ ] Monthly: Review `todo.txt` for doc gaps
- [ ] Quarterly: Refresh docs after architecture changes
- [ ] After incidents: Add troubleshooting entries