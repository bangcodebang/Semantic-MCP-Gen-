Semantic-MCP-Gen 🧠🗄️
The Human-in-the-Loop Generator for AI-Ready Database MCP Servers.
Semantic-MCP-Gen is a CLI tool that bridges the gap between raw database schemas and AI Agent understanding. It inspects your database, asks you what your data actually means in plain English, and generates a secure, production-ready Node.js MCP server.

🌟 The Problem
AI Agents (like Claude or GPT) struggle with cryptic database column names like usr_sts_01 and often hallucinate dangerous SQL queries.

🚀 The Solution
This tool creates a Semantic Abstraction Layer:
Introspection: Automatically maps your DB tables and columns.
HITL (Human-in-the-Loop): A setup wizard asks you for descriptions for each table and column.
Semantic Tools: The generated MCP server doesn't just "run SQL"—it provides tools with descriptions you wrote, so the LLM understands exactly what to call.
JSON Query API: The Agent sends structured JSON (e.g., { "find": "customers", "where": { "active": true } }). The server translates this to safe SQL. The Agent never writes raw SQL.


✨ Features
✅ Database Agnostic: Supports PostgreSQL, MySQL, and SQLite.
✅ Human-in-the-Loop: Interactive CLI to add business context.
✅ SQL Injection Proof: Translates JSON logic to parameterized queries.
✅ Zero-Config Deployment: Generates a complete Node.js project ready to run.
✅ Privacy First: Choose which columns to hide from the AI during setup.
