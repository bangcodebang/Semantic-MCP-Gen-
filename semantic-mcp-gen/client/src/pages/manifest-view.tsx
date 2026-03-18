import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileJson, Copy, Download, CheckCircle, Info, Shield, Database, Layers } from "lucide-react";
import type { Project } from "@shared/schema";
import { PageHeader } from "@/components/page-header";

function JsonHighlight({ json }: { json: object }) {
  const str = JSON.stringify(json, null, 2);
  const colored = str
    .replace(/(\"(?:[^\"\\]|\\.)*\")(\s*:)/g, '<span class="json-key">$1</span>$2')
    .replace(/:\s*(\"(?:[^\"\\]|\\.)*\")/g, ': <span class="json-string">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
  return (
    <pre className="code-block text-xs leading-relaxed overflow-auto" style={{ maxHeight: "65vh" }} dangerouslySetInnerHTML={{ __html: colored }} />
  );
}

function McpToolExample({ manifest }: { manifest: any }) {
  const tables = manifest?.tables || {};
  const firstKey = Object.keys(tables)[0];
  const firstTable = firstKey ? tables[firstKey] : null;
  const firstCols = firstTable ? Object.keys(firstTable.columns || {}) : [];

  const exampleQuery = firstKey ? {
    entity: firstKey,
    select: firstCols.slice(0, 3),
    where: firstCols[3] ? { [firstCols[3]]: { eq: "active" } } : undefined,
    limit: 50,
  } : { entity: "T1", select: ["C1", "C2"], limit: 50 };

  const listDomainsExample = Object.keys(
    Object.values(tables).reduce((acc: any, t: any) => { acc[t.domain] = true; return acc; }, {})
  );

  const toolExamples = `// MCP Tool: list_domains()
// Returns high-level data categories to guide exploration
{
  "domains": [${listDomainsExample.map(d => `"${d}"`).join(", ")}],
  "total_tables": ${Object.keys(tables).length}
}

// MCP Tool: search_metadata("customer orders")
// Semantic search across all table/column descriptions
{
  "results": [
    { "id": "${firstKey}", "name": "${firstTable?.tableName}", "match": "description" }
  ]
}

// MCP Tool: get_details("${firstKey}")
// Returns full column list + types for ONE table
{
  "table": "${firstTable?.tableName}",
  "columns": [${firstCols.map(c => `"${c}"`).join(", ")}]
}

// MCP Tool: execute_semantic_query(...)
// The Semantic Firewall — JSON in, validated SQL out
${JSON.stringify(exampleQuery, null, 2)}`;

  return (
    <pre className="code-block text-xs leading-relaxed overflow-auto text-cyan-300" style={{ maxHeight: "65vh" }}>
      {toolExamples}
    </pre>
  );
}

export default function ManifestView() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: project } = useQuery<Project>({ queryKey: ["/api/projects", projectId] });
  const { data: manifest, isLoading } = useQuery<object>({
    queryKey: [`/api/projects/${projectId}/manifest`],
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
    setCopied(true);
    toast({ title: "Manifest copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-project-${projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Manifest downloaded" });
  };

  const stats = manifest ? (() => {
    const m = manifest as any;
    const tables = Object.values(m.tables || {}) as any[];
    const totalCols = tables.reduce((a, t) => a + Object.keys(t.columns || {}).length, 0);
    const piiCols = tables.reduce((a, t) => a + Object.values(t.columns || {}).filter((c: any) => c.isPii).length, 0);
    const domains = new Set(tables.map((t: any) => t.domain)).size;
    const jsonSize = JSON.stringify(manifest).length;
    return { tables: tables.length, totalCols, piiCols, domains, jsonSize };
  })() : null;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        crumbs={[
          { label: "Projects", href: "/" },
          { label: project?.name || "Project", href: `/projects/${projectId}` },
          { label: "Semantic Manifest" },
        ]}
        title="Semantic Manifest"
        description="The AI brain — a compact, structured map of your database that the MCP server consumes."
        icon={<FileJson className="h-5 w-5" />}
        tooltip={{
          what: "A compact JSON file that describes your entire database semantically — using symbolic IDs (T1, C1) instead of real names to save LLM tokens.",
          why: "This is what the MCP server loads. Without it, an AI agent would need to read your raw schema (potentially 1000s of tables) and still not understand what data means.",
          how: "Review the manifest JSON to confirm it looks right. When you're happy, head to the MCP Wizard to generate and deploy a server that serves this manifest to agents.",
        }}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleCopy} data-testid="button-copy-manifest">
              {copied ? <CheckCircle className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleDownload} data-testid="button-download-manifest">
              <Download className="h-3 w-3" /> Download
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full">
        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-lg bg-secondary/20 animate-pulse" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { icon: Database, label: "Tables", value: stats.tables, color: "text-primary" },
              { icon: Layers, label: "Columns", value: stats.totalCols, color: "text-blue-400" },
              { icon: Shield, label: "PII Cols", value: stats.piiCols, color: "text-purple-400" },
              { icon: Info, label: "Domains", value: stats.domains, color: "text-cyan-400" },
              { icon: FileJson, label: "Size", value: `${(stats.jsonSize / 1024).toFixed(1)}KB`, color: "text-green-400" },
            ].map(s => (
              <Card key={s.label} className="border-border/40">
                <CardContent className="p-3 flex items-center gap-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <div>
                    <p className="font-mono font-semibold text-sm">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Philosophy */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-6 text-sm">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-muted-foreground text-xs leading-relaxed">
            <strong className="text-foreground">Why this matters:</strong> Raw DB schemas can be 1000+ tables and crash LLM context windows.
            This manifest uses <strong className="text-cyan-400">symbolic IDs</strong> (T1, C1) to save tokens,
            excludes hidden tables, and includes <strong className="text-green-400">business descriptions</strong> so the agent understands
            data semantically — not just structurally.
          </div>
        </div>

        {/* Tabs — full block, not wrapped in a flex row */}
        <Tabs defaultValue="manifest">
          <TabsList>
            <TabsTrigger value="manifest" data-testid="tab-manifest-json">manifest.json</TabsTrigger>
            <TabsTrigger value="tools" data-testid="tab-mcp-tools">MCP Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="manifest" className="mt-4">
            {isLoading ? (
              <div className="code-block h-64 animate-pulse" />
            ) : manifest ? (
              <JsonHighlight json={manifest} />
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border/30 rounded-lg">
                <FileJson className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>No manifest data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tools" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              The generated MCP server exposes these tools. The agent calls them to discover and query data without ever seeing SQL.
            </p>
            {isLoading ? (
              <div className="code-block h-64 animate-pulse" />
            ) : manifest ? (
              <McpToolExample manifest={manifest} />
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border/30 rounded-lg">
                <FileJson className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>No manifest data available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
