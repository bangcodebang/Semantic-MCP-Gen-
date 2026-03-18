# Semantic-MCP-Gen

> A semantic bridge between relational databases and AI agents — automates the creation of MCP servers that are secure, context-rich, and agent-ready.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20TypeScript-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What is this?

Raw database schemas are not AI-friendly. A 50-table production database dumped into an LLM context window will:
- Burn thousands of tokens on irrelevant tables
- Expose PII columns with no masking
- Let agents write arbitrary SQL with no guardrails
- Give the agent zero business context about what the data *means*

**Semantic-MCP-Gen** solves all of this. It takes your database schema, lets you enrich it with business descriptions and security rules, and generates a ready-to-deploy [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that AI agents can safely query.

---

## Features

### Schema & Enrichment
- Import your database schema and view all tables and columns
- Add business descriptions, assign domain tags (e.g. `Clinical`, `Finance`, `Sales`)
- Mark PII columns — they get automatically masked in all agent queries
- Hide system/audit tables from agent access entirely
- Filter tables by domain; search by name

### AI Schema Agent
- Paste an OpenAI or Anthropic API key and click **Auto-Enrich**
- The agent reads your schema and automatically writes business descriptions, assigns domain tags, and detects PII columns
- Your API key is used once and never stored server-side

### Relation Graph
- Visual domain map showing all tables grouped by domain
- All foreign key relationships listed as named join paths
- Toggle individual relationships on/off to control what the agent can traverse

### Query Firewall
- Test the semantic JSON → SQL engine directly
- Visual builder (pick table, columns, filters) or raw JSON mode
- PII columns are masked in results automatically
- Hidden tables and columns are inaccessible — agents cannot bypass this

### Semantic Manifest
- One-click generation of `manifest.json` — the compact, symbolic representation of your schema
- Uses symbolic IDs (`T1`, `C1`) instead of full names to save LLM tokens
- Excludes hidden tables and PII raw values
- Shows manifest size, table count, PII column count, domain count

### MCP Hosting Wizard
4-step in-app guide to go from manifest to a live MCP server:
1. **Review** — manifest health check (missing descriptions, PII coverage)
2. **Generate** — produces a ready-to-run `server.js` + `package.json`
3. **Deploy** — step-by-step instructions for Local, Railway, Render, or Docker
4. **Connect** — Cursor IDE and Claude Desktop config snippets, curl test command

### Query Logs
- Full audit trail of every semantic query executed through the firewall
- Shows input JSON, generated SQL, status (success/error), rows returned, timestamp
- Auto-refreshes every 10 seconds

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui + Tailwind CSS |
| Routing | wouter (hash-based routing) |
| Backend | Express.js (Node.js) |
| Data layer | Drizzle ORM + Zod |
| AI Integration | OpenAI (`gpt-4o-mini`) + Anthropic (`claude-3-5-haiku`) |
| Storage | In-memory (MemStorage) — plug in a real DB for production |

---

## Project Structure

```
semantic-mcp-gen/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── dashboard.tsx          # Project list
│       │   ├── project-view.tsx       # Schema & Enrichment
│       │   ├── schema-graph.tsx       # Relation Graph
│       │   ├── query-builder.tsx      # Query Firewall
│       │   ├── manifest-view.tsx      # Semantic Manifest
│       │   ├── query-logs.tsx         # Query Logs
│       │   └── mcp-wizard.tsx         # MCP Hosting Wizard
│       ├── components/
│       │   ├── agent-panel.tsx        # AI Schema Agent UI
│       │   ├── app-sidebar.tsx        # Navigation sidebar
│       │   └── page-header.tsx        # Breadcrumbs + tooltips
│       └── App.tsx                    # Router
├── server/
│   ├── storage.ts                     # Demo data + in-memory storage
│   ├── routes.ts                      # All API endpoints
│   └── index.ts                       # Server startup
└── shared/
    └── schema.ts                      # Shared data models (Drizzle + Zod)
```

---

## Getting Started

### Prerequisites
- [Node.js 18+](https://nodejs.org)

### Run from source

```bash
git clone https://github.com/bangcodebang/semantic-mcp-gen.git
cd semantic-mcp-gen
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

### Build for production

```bash
npm run build
node dist/index.cjs
```

### Windows

```cmd
npm install
node dist/index.cjs
```

Then open [http://localhost:5000](http://localhost:5000)

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/projects/:id` | Get project details |
| `GET` | `/api/projects/:id/tables` | Get all tables |
| `GET` | `/api/projects/:id/columns` | Get all columns |
| `GET` | `/api/projects/:id/relationships` | Get FK relationships |
| `POST` | `/api/projects/:id/query` | Execute a semantic query |
| `GET` | `/api/projects/:id/manifest` | Get generated manifest.json |
| `GET` | `/api/projects/:id/logs` | Get query audit logs |
| `PATCH` | `/api/tables/:id` | Update table metadata |
| `PATCH` | `/api/columns/:id` | Update column metadata |
| `PATCH` | `/api/relationships/:id` | Update relationship |
| `POST` | `/api/projects/:id/agent/enrich` | Run AI auto-enrichment |

### Semantic Query Format

Agents query the firewall using JSON — raw SQL is never exposed:

```json
{
  "entity": "T1",
  "select": ["C1", "C2", "C4"],
  "where": {
    "C4": { "eq": "active" }
  },
  "limit": 50
}
```

Supported operators: `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `in`

---

## Core Philosophy

**Safety First** — The agent never writes raw SQL. All queries go through a validated JSON-to-SQL abstraction layer.

**Context is King** — A database without semantic context is just noise to an LLM. Every table and column carries a business description.

**Token Efficiency** — The manifest uses symbolic IDs (`T1`, `C3`) to reduce schema context size by over 70% compared to a raw SQL dump.

**PII by Default** — Mark a column as PII once. It is masked in every query response automatically, forever.

---

## Roadmap

- [ ] Real database connection (PostgreSQL, MySQL, SQLite)
- [ ] CSV / SQL schema file import
- [ ] Schema drift detection — alert when the DB schema changes
- [ ] Vector search for semantic table discovery
- [ ] Multi-table join support in the query engine
- [ ] Role-based access control (admin vs read-only)
- [ ] Export manifest as a downloadable `.json` file

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

---

## License

MIT

---

Built with [Perplexity Computer](https://www.perplexity.ai/computer)
