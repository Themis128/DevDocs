#!/usr/bin/env python3
"""
Tests for the fast-markdown-mcp server.
This module tests the MCP server functionality directly.
"""

import unittest
import asyncio
import tempfile
import os
import sys
import shutil
from pathlib import Path

# Add the src directory to the path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "fast-markdown-mcp" / "src"))

from fast_markdown_mcp.document_structure import DocumentStructure, Section


class TestDocumentStructure(unittest.TestCase):
    """Tests for the DocumentStructure class."""
    
    def test_parse_simple_document(self):
        """Test parsing a simple markdown document."""
        content = """# Main Title

This is the introduction.

## Section 1

Content for section 1.

## Section 2

Content for section 2.

### Subsection 2.1

Content for subsection 2.1.
"""
        structure = DocumentStructure()
        structure.parse_document(content)
        
        # # Main Title becomes the top-level section, h2s are subsections
        self.assertEqual(len(structure.sections), 1, "Should have 1 top-level section (Main Title)")
        self.assertEqual(structure.sections[0].title, "Main Title")
        # h2 sections should be subsections of Main Title
        self.assertEqual(len(structure.sections[0].subsections), 2, "Should have 2 subsections")
        self.assertEqual(structure.sections[0].subsections[0].title, "Section 1")
        self.assertEqual(structure.sections[0].subsections[1].title, "Section 2")
    
    def test_parse_document_no_headers(self):
        """Test parsing a document without headers."""
        content = "This is just plain text without any headers."
        
        structure = DocumentStructure()
        structure.parse_document(content)
        
        self.assertEqual(len(structure.sections), 1, "Should have 1 section (entire document)")
        self.assertEqual(structure.sections[0].title, "Document")
        self.assertIn("plain text", structure.sections[0].content)
    
    def test_get_table_of_contents(self):
        """Test getting table of contents."""
        content = """# Title

## Section 1

## Section 2

### Subsection
"""
        structure = DocumentStructure()
        structure.parse_document(content)
        
        toc = structure.get_table_of_contents()
        
        self.assertTrue(len(toc) > 0, "TOC should not be empty")
        section_ids = [item[2] for item in toc]
        self.assertIn("section-1", section_ids)
        self.assertIn("section-2", section_ids)
    
    def test_section_id_generation(self):
        """Test section ID generation."""
        structure = DocumentStructure()
        
        # Test simple title
        section_id = structure._make_section_id("Simple Title")
        self.assertEqual(section_id, "simple-title")
        
        # Test title with special characters
        section_id = structure._make_section_id("API & Integration!")
        self.assertEqual(section_id, "api-integration")
        
        # Test title with multiple spaces
        section_id = structure._make_section_id("Multiple   Spaces")
        self.assertEqual(section_id, "multiple-spaces")


class TestMarkdownStore(unittest.TestCase):
    """Tests for the MarkdownStore class."""
    
    def setUp(self):
        """Set up test fixtures."""
        from fast_markdown_mcp.server import MarkdownStore
        
        # Create a temporary directory with test markdown files
        self.temp_dir = tempfile.mkdtemp()
        
        # Create test markdown file
        with open(os.path.join(self.temp_dir, "test.md"), "w") as f:
            f.write("""# Test Document

## Introduction

This is a test document.

## Getting Started

Follow these steps.
""")
        
        self.store = MarkdownStore(self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_list_files(self):
        """Test listing markdown files."""
        result = asyncio.run(self.store.list_files())
        
        # The list_files returns "Available markdown files:\n- test"
        self.assertIn("test", result)
    
    def test_read_file(self):
        """Test reading a markdown file."""
        result = asyncio.run(self.store.read_file("test"))
        
        self.assertIn("# Test Document", result)
        self.assertIn("Introduction", result)
    
    def test_search_files(self):
        """Test searching markdown files."""
        result = asyncio.run(self.store.search_files("test"))
        
        self.assertIn("match", result.lower())
    
    def test_get_table_of_contents(self):
        """Test getting table of contents."""
        result = asyncio.run(self.store.get_table_of_contents("test"))
        
        self.assertIn("Test Document", result)
        self.assertIn("Introduction", result)
    
    def test_sync_file(self):
        """Test syncing a file."""
        result = asyncio.run(self.store.sync_file("test"))
        
        self.assertIn("Successfully synced", result)


class TestMCPEntryPoint(unittest.TestCase):
    """Tests for the MCP server entry point."""
    
    def test_run_main_exists(self):
        """Test that run_main function exists."""
        from fast_markdown_mcp.server import run_main
        
        self.assertTrue(callable(run_main))
    
    def test_main_is_coroutine(self):
        """Test that main is an async function."""
        from fast_markdown_mcp.server import main
        import inspect
        
        self.assertTrue(inspect.iscoroutinefunction(main))


if __name__ == "__main__":
    unittest.main(verbosity=2)