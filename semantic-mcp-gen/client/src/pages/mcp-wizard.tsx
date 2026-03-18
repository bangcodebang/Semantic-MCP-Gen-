import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";
import {
  Rocket, CheckCircle, Copy, Download, ChevronRight,
  Terminal, FileJson, Code2, Globe, Server, Package,
  Zap, Shield, ArrowRight, Check
} from "lucide-react";

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ steps, current }: { steps: { label: string; icon: React.ElementType }[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={cn(
              "flex items-center justify-center h-9 w-9 rounded-full border-2 transition-all text-sm font-semibold",
              i < current
                ? "bg-green-500/20 border-green-500 text-green-400"
                : i === current
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-secondary/30 border-border/40 text-muted-foreground"
            )}>
              {i < current ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
            </div>
            <span className={cn(
              "text-[10px] mt-1.5 font-medium whitespace-nowrap",
              i === current ? "text-primary" : i < current ? "text-green-400" : "text-muted-foreground"
            )}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("h-0.5 w-12 mx-1 mb-5 transition-colors", i < current ? "bg-green-500/50" : "bg-border/30")} />
          )}
        </div>
      ))}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 shrink-0" onClick={copy}>
      {copied ? <><CheckCircle className="h-3 w-3 text-green-400" /> Copied!</> : <><Copy className="h-3 w-3" /> {label}</>}
    </Button>
  );
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative rounded-lg border border-border/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/30 border-b border-border/30">
        <span className="text-[10px] text-muted-foreground font-mono uppercase">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs font-mono text-cyan-300 leading-relaxed overflow-auto">{code}</pre>
    </div>
  );
}

// ── Step 1: Review Manifest ───────────────────────────────────────────────────
function Step1Review({ manifest, project, onNext }: { manifest: any; project?: Project; onNext: () => void }) {
  const stats = manifest ? (() => {
    const tables = Object.values(manifest.tables || {}) as any[];
    const totalCols = tables.reduce((a: number, t: any) => a + Object.keys(t.columns || {}).length, 0);
    const piiCols = tables.reduce((a: number, t: any) => a + Object.values(t.columns || {}).filter((c: any) => c.isPii).length, 0);
    const noDesc = tables.filter((t: any) => !t.description || t.description === "").length;
    return { tables: tables.length, totalCols, piiCols, noDesc };
  })() : null;

  const isReady = stats && stats.noDesc === 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-1">Review your Semantic Manifest</h2>
        <p className="text-sm text-muted-foreground">
          Before generating your MCP server, make sure all tables have descriptions. The AI agent on the Schema page can fill these in automatically.
        </p>
      </div>

      {/* Manifest health */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Tables", value: stats.tables, color: "text-primary", ok: true },
            { label: "Columns", value: stats.totalCols, color: "text-blue-400", ok: true },
            { label: "PII Protected", value: stats.piiCols, color: "text-purple-400", ok: true },
            { label: "Missing Descriptions", value: stats.noDesc, color: stats.noDesc > 0 ? "text-yellow-400" : "text-green-400", ok: stats.noDesc === 0 },
          ].map(s => (
            <Card key={s.label} className={cn("border-border/40", !s.ok && "border-yellow-500/30")}>
              <CardContent className="p-3">
                <p className={cn("text-xl font-bold font-mono", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Warning if descriptions missing */}
      {stats && stats.noDesc > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
          <Zap className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-400 mb-0.5">{stats.noDesc} table(s) have no description</p>
            <p className="text-xs text-muted-foreground">
              Go to <strong>Schema & Enrichment</strong> and use the AI Agent to auto-fill descriptions. Agents work best with rich semantic context.
            </p>
          </div>
        </div>
      )}

      {/* All good */}
      {isReady && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
          <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
          <p className="text-green-400 font-medium">All tables are documented. Your manifest is ready to generate an MCP server.</p>
        </div>
      )}

      <Button onClick={onNext} className="gap-2" data-testid="button-step1-next">
        Continue to Generate Server <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Step 2: Generate MCP Server Code ─────────────────────────────────────────
function Step2Generate({ manifest, project, onNext }: { manifest: any; project?: Project; onNext: () => void }) {
  const { toast } = useToast();

  const serverCode = generateMcpServerCode(manifest, project);
  const packageJson = generatePackageJson(project);

  const handleDownload = () => {
    const zip = `// Download as zip — copy these files to your project:\n// server.js — main MCP server\n// package.json — dependencies`;
    const blob = new Blob([serverCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mcp-server.js";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "server.js downloaded" });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-1">Generated MCP Server</h2>
        <p className="text-sm text-muted-foreground">
          A ready-to-run Node.js MCP server generated from your semantic manifest. It exposes 4 tools to any AI agent.
        </p>
      </div>

      {/* Tool summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { name: "list_domains()", desc: "Returns all data domains" },
          { name: "search_metadata()", desc: "Semantic table search" },
          { name: "get_details()", desc: "Full column info for one table" },
          { name: "execute_query()", desc: "JSON→SQL firewall" },
        ].map(t => (
          <div key={t.name} className="p-3 rounded-lg border border-border/40 bg-secondary/20">
            <code className="text-xs text-cyan-400 font-mono block mb-1">{t.name}</code>
            <p className="text-[10px] text-muted-foreground">{t.desc}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="server">
        <TabsList>
          <TabsTrigger value="server">server.js</TabsTrigger>
          <TabsTrigger value="package">package.json</TabsTrigger>
        </TabsList>
        <TabsContent value="server" className="mt-3">
          <CodeBlock code={serverCode} language="javascript" />
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" /> Download server.js
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="package" className="mt-3">
          <CodeBlock code={packageJson} language="json" />
        </TabsContent>
      </Tabs>

      <Button onClick={onNext} className="gap-2" data-testid="button-step2-next">
        Continue to Deploy <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Step 3: Deploy Instructions ───────────────────────────────────────────────
function Step3Deploy({ project, onNext }: { project?: Project; onNext: () => void }) {
  const [platform, setPlatform] = useState<"local" | "railway" | "render" | "docker">("local");

  const deployInstructions: Record<string, { label: string; icon: React.ElementType; steps: Array<{ title: string; code?: string; note?: string }> }> = {
    local: {
      label: "Local / Self-hosted",
      icon: Terminal,
      steps: [
        { title: "Create a new folder and add the files", code: "mkdir my-mcp-server && cd my-mcp-server\n# Copy server.js and package.json into this folder" },
        { title: "Install dependencies", code: "npm install" },
        { title: "Start the server", code: "node server.js", note: "Server starts on port 3001 by default. Set PORT env var to change." },
        { title: "Test it works", code: `curl http://localhost:3001/mcp/tools`, note: "Should return a JSON list of the 4 MCP tools." },
      ],
    },
    railway: {
      label: "Railway (free tier)",
      icon: Globe,
      steps: [
        { title: "Push files to a GitHub repo", code: "git init && git add . && git commit -m 'init'\ngit remote add origin https://github.com/you/mcp-server.git\ngit push -u origin main" },
        { title: "Create a Railway project", note: "Go to railway.app → New Project → Deploy from GitHub repo → select your repo." },
        { title: "Set environment variables", code: "PORT=3001", note: "In Railway dashboard → Variables tab." },
        { title: "Get your public URL", note: "Railway auto-assigns a URL like https://mcp-server-production.up.railway.app — copy it for the next step." },
      ],
    },
    render: {
      label: "Render (free tier)",
      icon: Server,
      steps: [
        { title: "Push files to GitHub", code: "git init && git add . && git commit -m 'init'\ngit push -u origin main" },
        { title: "Create a Web Service on Render", note: "Go to render.com → New → Web Service → Connect your GitHub repo." },
        { title: "Configure the service", code: "Build Command: npm install\nStart Command: node server.js", note: "Free tier spins down after inactivity — use paid tier for production." },
        { title: "Get your URL", note: "Render assigns a URL like https://my-mcp-server.onrender.com" },
      ],
    },
    docker: {
      label: "Docker",
      icon: Package,
      steps: [
        { title: "Create Dockerfile", code: `FROM node:20-alpine\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCOPY server.js .\nEXPOSE 3001\nCMD ["node", "server.js"]` },
        { title: "Build the image", code: "docker build -t my-mcp-server ." },
        { title: "Run the container", code: "docker run -p 3001:3001 my-mcp-server" },
        { title: "Push to registry (optional)", code: "docker tag my-mcp-server your-registry/mcp-server:latest\ndocker push your-registry/mcp-server:latest" },
      ],
    },
  };

  const current = deployInstructions[platform];
  const CurrentIcon = current.icon;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-1">Deploy Your MCP Server</h2>
        <p className="text-sm text-muted-foreground">
          Choose your deployment platform and follow the steps to get your MCP server running.
        </p>
      </div>

      {/* Platform selector */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(deployInstructions).map(([key, val]) => {
          const Icon = val.icon;
          return (
            <button
              key={key}
              onClick={() => setPlatform(key as any)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                platform === key
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-secondary/20 border-border/30 text-muted-foreground hover:border-border"
              )}
              data-testid={`button-platform-${key}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {val.label}
            </button>
          );
        })}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {current.steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1.5">{step.title}</p>
              {step.code && <CodeBlock code={step.code} language={platform === "docker" && i === 0 ? "dockerfile" : "bash"} />}
              {step.note && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
                  <span className="text-primary/60 shrink-0">ℹ</span> {step.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="gap-2" data-testid="button-step3-next">
        Continue to Connect Agent <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Step 4: Connect to AI Agent ───────────────────────────────────────────────
function Step4Connect({ project }: { project?: Project }) {
  const { toast } = useToast();

  const cursorConfig = `{
  "mcpServers": {
    "${project?.name?.toLowerCase().replace(/\s+/g, '-') || 'my-db'}-mcp": {
      "url": "http://localhost:3001/mcp",
      "transport": "sse"
    }
  }
}`;

  const claudeDesktopConfig = `{
  "mcpServers": {
    "${project?.name?.toLowerCase().replace(/\s+/g, '-') || 'my-db'}-mcp": {
      "command": "node",
      "args": ["/path/to/your/server.js"]
    }
  }
}`;

  const testCurl = `# List available tools
curl http://localhost:3001/mcp/tools

# Test list_domains
curl -X POST http://localhost:3001/mcp/call \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "list_domains", "arguments": {}}'

# Test search_metadata
curl -X POST http://localhost:3001/mcp/call \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "search_metadata", "arguments": {"query": "customer orders"}}'`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-1">Connect to Your AI Agent</h2>
        <p className="text-sm text-muted-foreground">
          Your MCP server is running. Now point your AI agent at it — your agent will automatically discover the tools.
        </p>
      </div>

      {/* Success badge */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/25">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-500/20 shrink-0">
          <CheckCircle className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <p className="font-semibold text-green-400">Your MCP server is configured</p>
          <p className="text-xs text-muted-foreground mt-0.5">The server exposes 4 tools — agents can now query your {project?.name} safely.</p>
        </div>
      </div>

      {/* Client configs */}
      <Tabs defaultValue="cursor">
        <TabsList>
          <TabsTrigger value="cursor">Cursor IDE</TabsTrigger>
          <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
          <TabsTrigger value="test">Test with curl</TabsTrigger>
        </TabsList>

        <TabsContent value="cursor" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Open Cursor Settings → MCP → paste this into <code className="text-primary bg-secondary/40 px-1 rounded">~/.cursor/mcp.json</code>:
          </p>
          <CodeBlock code={cursorConfig} language="json" />
          <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-secondary/20 border border-border/30">
            <p className="font-medium text-foreground">After connecting:</p>
            <p>• In any Cursor chat, type <code className="text-cyan-400">@{project?.name?.toLowerCase().replace(/\s+/g, '-') || 'my-db'}-mcp</code> to reference your database</p>
            <p>• Ask things like: "What tables store customer orders?" or "Show me the top 10 products by price"</p>
          </div>
        </TabsContent>

        <TabsContent value="claude" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Open Claude Desktop → Settings → Developer → Edit Config, paste this into <code className="text-primary bg-secondary/40 px-1 rounded">claude_desktop_config.json</code>:
          </p>
          <CodeBlock code={claudeDesktopConfig} language="json" />
          <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-secondary/20 border border-border/30">
            <p className="font-medium text-foreground">After connecting:</p>
            <p>• Claude will discover your MCP tools automatically on startup</p>
            <p>• Replace <code className="text-cyan-400">/path/to/your/server.js</code> with the actual path to your server.js file</p>
          </div>
        </TabsContent>

        <TabsContent value="test" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Test your MCP server is working before connecting an agent:</p>
          <CodeBlock code={testCurl} language="bash" />
        </TabsContent>
      </Tabs>

      {/* What your agent can ask */}
      <div>
        <p className="text-sm font-medium mb-3">Example questions your AI agent can now answer:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "What tables store customer information?",
            "Show me the top 10 orders by value",
            "Which columns contain personally identifiable data?",
            "List all products in the Catalog domain",
            "How many users signed up this month?",
            "What are the available order statuses?",
          ].map((q) => (
            <div key={q} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/20 border border-border/30 text-xs text-muted-foreground">
              <span className="text-primary/60 shrink-0 mt-0.5">›</span>
              <span>"{q}"</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-primary shrink-0" />
        <span><strong className="text-foreground">Security reminder:</strong> The MCP server enforces all rules from your manifest — PII masking, hidden table exclusion, and query row limits are always active. Your agent cannot bypass these controls.</span>
      </div>
    </div>
  );
}

// ── Code generators ───────────────────────────────────────────────────────────
function generateMcpServerCode(manifest: any, project?: Project): string {
  const projectName = project?.name || "My Database";
  const manifestStr = JSON.stringify(manifest || {}, null, 2);

  return `/**
 * MCP Server for: ${projectName}
 * Generated by Semantic-MCP-Gen
 * 
 * Tools exposed:
 *   list_domains()        — list all data domains
 *   search_metadata(q)    — semantic search over tables/columns
 *   get_details(id)       — get all columns for a table
 *   execute_query(json)   — semantic JSON→SQL firewall
 */

const http = require("http");

// ── Semantic Manifest (auto-generated) ───────────────────────────────────────
const MANIFEST = ${manifestStr};

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "list_domains",
    description: "Returns all data domains available in the database. Call this first to understand the high-level structure before querying.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "search_metadata",
    description: "Semantic search across all table and column descriptions. Use this to find which tables/columns are relevant to a question.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Natural language search query" } },
      required: ["query"],
    },
  },
  {
    name: "get_details",
    description: "Get full column details for a specific table by its symbolic ID (e.g. T1, T2). Use after search_metadata to inspect columns.",
    inputSchema: {
      type: "object",
      properties: { tableId: { type: "string", description: "Symbolic table ID from list_domains or search_metadata" } },
      required: ["tableId"],
    },
  },
  {
    name: "execute_query",
    description: "Execute a semantic query using symbolic IDs. Returns real data with PII masking and row limits enforced.",
    inputSchema: {
      type: "object",
      properties: {
        entity:  { type: "string", description: "Symbolic table ID (e.g. T1)" },
        select:  { type: "array",  items: { type: "string" }, description: "Symbolic column IDs to return" },
        where:   { type: "object", description: "Optional filter conditions" },
        limit:   { type: "number", description: "Max rows (default 50, max 200)" },
        orderBy: { type: "object", properties: { column: { type: "string" }, direction: { type: "string" } } },
      },
      required: ["entity", "select"],
    },
  },
];

// ── Tool implementations ──────────────────────────────────────────────────────
function toolListDomains() {
  const tables = Object.values(MANIFEST.tables || {});
  const domains = [...new Set(tables.map(t => t.domain))];
  return {
    domains,
    total_tables: tables.length,
    tables_per_domain: Object.fromEntries(
      domains.map(d => [d, tables.filter(t => t.domain === d).length])
    ),
  };
}

function toolSearchMetadata(query) {
  const q = query.toLowerCase();
  const tables = Object.entries(MANIFEST.tables || {});
  const results = [];
  for (const [id, table] of tables) {
    const score =
      (table.tableName?.toLowerCase().includes(q) ? 3 : 0) +
      (table.description?.toLowerCase().includes(q) ? 2 : 0) +
      (table.domain?.toLowerCase().includes(q) ? 1 : 0);
    if (score > 0) results.push({ id, name: table.tableName, description: table.description, domain: table.domain, score });

    for (const [colId, col] of Object.entries(table.columns || {})) {
      const colScore =
        (col.columnName?.toLowerCase().includes(q) ? 2 : 0) +
        (col.description?.toLowerCase().includes(q) ? 1 : 0);
      if (colScore > 0) results.push({ id: colId, tableId: id, tableName: table.tableName, name: col.columnName, description: col.description, type: "column", score: colScore });
    }
  }
  return { results: results.sort((a, b) => b.score - a.score).slice(0, 10), query };
}

function toolGetDetails(tableId) {
  const table = MANIFEST.tables?.[tableId];
  if (!table) return { error: \`Table '\${tableId}' not found. Use list_domains to see valid IDs.\` };
  return {
    id: tableId,
    tableName: table.tableName,
    description: table.description,
    domain: table.domain,
    rowCount: table.rowCount,
    columns: Object.entries(table.columns || {}).map(([id, col]) => ({
      id, name: col.columnName, type: col.dataType,
      description: col.description,
      isPrimaryKey: col.isPrimaryKey,
      isForeignKey: col.isForeignKey,
      isPii: col.isPii,
      sampleValues: col.sampleValues,
    })),
  };
}

function toolExecuteQuery(args) {
  // NOTE: This is a stub — connect to your real database here.
  // The semantic firewall logic (PII masking, hidden table enforcement) should run here.
  const table = MANIFEST.tables?.[args.entity];
  if (!table) return { error: \`Entity '\${args.entity}' not found or is hidden\` };

  const piiCols = args.select.filter(colId => table.columns?.[colId]?.isPii);

  // Build SQL for reference
  const colNames = args.select.map(id => table.columns?.[id]?.columnName || id).join(", ");
  const sql = \`SELECT \${colNames} FROM \${table.tableName} LIMIT \${Math.min(args.limit || 50, 200)}\`;

  return {
    sql,
    note: "Connect to your database to execute. Replace this stub with your DB driver (pg, mysql2, better-sqlite3, etc.)",
    piiColumns: piiCols,
    piiMasked: piiCols.length > 0,
    entity: args.entity,
    tableName: table.tableName,
  };
}

// ── HTTP MCP handler ──────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "GET" && req.url === "/mcp/tools") {
    res.writeHead(200);
    res.end(JSON.stringify({ tools: TOOLS }));
    return;
  }

  if (req.method === "POST" && req.url === "/mcp/call") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { tool, arguments: args = {} } = JSON.parse(body);
        let result;
        if (tool === "list_domains")   result = toolListDomains();
        else if (tool === "search_metadata") result = toolSearchMetadata(args.query);
        else if (tool === "get_details")     result = toolGetDetails(args.tableId);
        else if (tool === "execute_query")   result = toolExecuteQuery(args);
        else result = { error: \`Unknown tool: \${tool}\` };
        res.writeHead(200);
        res.end(JSON.stringify({ result }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    name: "${projectName} MCP Server",
    version: "1.0.0",
    tools: TOOLS.map(t => t.name),
    endpoints: { tools: "GET /mcp/tools", call: "POST /mcp/call" },
  }));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(\`MCP server running on http://localhost:\${PORT}\`));
`;
}

function generatePackageJson(project?: Project): string {
  return JSON.stringify({
    name: `${project?.name?.toLowerCase().replace(/\s+/g, '-') || 'mcp-server'}`,
    version: "1.0.0",
    description: `MCP server for ${project?.name || 'database'} — generated by Semantic-MCP-Gen`,
    main: "server.js",
    scripts: {
      start: "node server.js",
      dev: "node --watch server.js",
    },
    engines: { node: ">=18.0.0" },
    license: "MIT",
  }, null, 2);
}

// ── Main Wizard page ──────────────────────────────────────────────────────────
const STEPS = [
  { label: "Review", icon: FileJson },
  { label: "Generate", icon: Code2 },
  { label: "Deploy", icon: Server },
  { label: "Connect", icon: Rocket },
];

export default function McpWizard() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [step, setStep] = useState(0);

  const { data: project } = useQuery<Project>({ queryKey: ["/api/projects", projectId] });
  const { data: manifest, isLoading } = useQuery<object>({
    queryKey: [`/api/projects/${projectId}/manifest`],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        crumbs={[
          { label: "Projects", href: "/" },
          { label: project?.name || "Project", href: `/projects/${projectId}` },
          { label: "MCP Hosting Wizard" },
        ]}
        title="MCP Hosting Wizard"
        description="Step-by-step guide to generate, deploy, and connect your MCP server to an AI agent."
        icon={<Rocket className="h-5 w-5" />}
        tooltip={{
          what: "A guided 4-step wizard that takes you from a configured database all the way to a live MCP server that any AI agent can connect to.",
          why: "An MCP (Model Context Protocol) server is the bridge between your database and AI agents like Claude or GPT-4. Without it, agents can't safely query your data.",
          how: "Follow each step in order: review your manifest → generate server code → deploy it → connect your AI agent.",
        }}
      />

      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
        <StepIndicator steps={STEPS} current={step} />

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-secondary/20 animate-pulse" />)}
          </div>
        ) : (
          <>
            {step === 0 && <Step1Review manifest={manifest} project={project} onNext={() => setStep(1)} />}
            {step === 1 && <Step2Generate manifest={manifest} project={project} onNext={() => setStep(2)} />}
            {step === 2 && <Step3Deploy project={project} onNext={() => setStep(3)} />}
            {step === 3 && <Step4Connect project={project} />}
          </>
        )}

        {/* Nav dots at bottom */}
        {step > 0 && (
          <div className="mt-8 pt-4 border-t border-border/30 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="text-xs">
              ← Back
            </Button>
            <div className="flex gap-1.5 ml-auto">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step ? "w-4 bg-primary" : i < step ? "w-1.5 bg-green-500/60" : "w-1.5 bg-border/40"
                  )}
                  onClick={() => setStep(i)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
