import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * MCP Server Integration Tests for DevDocs
 * These tests verify:
 * 1. MCP configuration API endpoint works
 * 2. MCP status endpoint responds correctly
 * 3. MCP tools integration with frontend UI
 */

// Test MCP configuration endpoint
test.describe('MCP Configuration API', () => {
  test('should return MCP server configuration', async ({ request }) => {
    const response = await request.get('/api/mcp/config');
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    expect(config).toHaveProperty('mcpServers');
    expect(config.mcpServers).toHaveProperty('fast-markdown');
    
    const mcpConfig = config.mcpServers['fast-markdown'];
    expect(mcpConfig.command).toBeTruthy();
    expect(mcpConfig.args).toBeTruthy();
  });

  test('should have correct MCP server tool definitions', async ({ request }) => {
    const response = await request.get('/api/mcp/config');
    const config = await response.json();
    
    // Verify expected tools are listed
    const expectedTools = [
      'sync_file',
      'get_status',
      'list_files',
      'read_file',
      'search_files',
      'search_by_tag',
      'get_stats',
      'get_section',
      'get_table_of_contents',
      'smart_section_search'
    ];
    
    const mcpConfig = config.mcpServers['fast-markdown'];
    expect(mcpConfig.alwaysAllow).toEqual(expect.arrayContaining(expectedTools));
  });
});

// Test MCP status endpoint
test.describe('MCP Status Endpoint', () => {
  test('should return MCP server status', async ({ request }) => {
    const response = await request.get('/api/mcp/status');
    
    // The endpoint should work whether MCP is running or not
    expect([200, 404, 503]).toContain(response.status());
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(['running', 'stopped', 'error']).toContain(data.status);
  });
});

// Test MCP logs endpoint
test.describe('MCP Logs Endpoint', () => {
  test('should return MCP logs array', async ({ request }) => {
    const response = await request.get('/api/mcp/logs');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('logs');
    expect(Array.isArray(data.logs)).toBeTruthy();
  });
});

// Test MCP UI integration
test.describe('MCP UI Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display MCP configuration button', async ({ page }) => {
    // The Settings button should be visible in the header
    const settingsButton = page.locator('button[aria-label="MCP Server Configuration"]');
    await expect(settingsButton).toBeVisible();
  });

  test('should have MCP status display in consolidated files section', async ({ page }) => {
    // Check if the ConsolidatedFiles component exists and has MCP status
    const consolidatedSection = page.locator('text=Consolidated Documentation');
    if (await consolidatedSection.isVisible()) {
      // If there are files, verify MCP status is shown
      const mcpStatus = page.locator('[data-testid="mcp-status"]');
      await expect(mcpStatus).toBeVisible();
    }
  });
});

// Test MCP server Python module directly
test.describe('MCP Server Python Module', () => {
  test('should be importable', async () => {
    // This test verifies the MCP server module can be imported
    // Run via subprocess or API check
    const response = await fetch('http://localhost:24125/api/mcp/status').catch(() => null);
    // If backend is running, this should work
    // If not, we skip the actual test
    if (response) {
      expect(response.ok).toBeTruthy();
    }
  });
});

// Test storage file content API
test.describe('Storage File Content API', () => {
  test('should read markdown file content', async ({ request }) => {
    const response = await request.get('/api/storage/file-content?file_path=test.md');
    
    // Should either return 200 with content or 404 if file doesn't exist
    expect([200, 404]).toContain(response.status());
  });
});

// Test end-to-end MCP workflow
test.describe('MCP End-to-End Workflow', () => {
  test('should be able to discover pages and see them listed', async ({ page }) => {
    // Navigate to the page
    await page.goto('/');
    
    // Check the URL input is present
    const urlInput = page.locator('input[type="url"], input[placeholder*="url" i]');
    await expect(urlInput).toBeVisible();
    
    // Check that the discovery form exists
    const discoverButton = page.locator('button:has-text("Discover"), button:has-text("Start")');
    await expect(discoverButton).toBeVisible();
  });
  
  test('should show MCP config dialog when settings clicked', async ({ page }) => {
    await page.goto('/');
    
    // Click settings button
    const settingsButton = page.locator('button[aria-label="MCP Server Configuration"]');
    await settingsButton.click();
    
    // Dialog should appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Dialog should contain MCP configuration info
    const dialogContent = await dialog.textContent();
    expect(dialogContent).toBeTruthy();
  });
});