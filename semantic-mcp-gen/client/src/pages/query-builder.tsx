import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Project, DbTable, DbColumn } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Play, Plus, X, Shield, CheckCircle, XCircle, Code2, AlertTriangle, Copy, Key } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type WhereClause = { sym: string; op: string; value: string };

const OPS = [
  { value: "eq", label: "= equals" },
  { value: "neq", label: "≠ not equals" },
  { value: "gt", label: "> greater than" },
  { value: "lt", label: "< less than" },
  { value: "like", label: "~ like (pattern)" },
  { value: "in", label: "∈ in (comma-sep)" },
];

function JsonHighlight({ json }: { json: object }) {
  const str = JSON.stringify(json, null, 2);
  const colored = str
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: null/g, ': <span class="json-null">null</span>');
  return (
    <pre className="code-block text-xs leading-relaxed overflow-auto max-h-64" dangerouslySetInnerHTML={{ __html: colored }} />
  );
}

export default function QueryBuilder() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { toast } = useToast();

  const { data: project } = useQuery<Project>({ queryKey: ["/api/projects", projectId] });
  const { data: tables = [] } = useQuery<DbTable[]>({ queryKey: [`/api/projects/${projectId}/tables`] });
  const { data: allColumns = [] } = useQuery<DbColumn[]>({ queryKey: [`/api/projects/${projectId}/columns`] });

  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [limit, setLimit] = useState("50");
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"builder" | "raw">("builder");
  const [rawJson, setRawJson] = useState("");

  const visibleTables = tables.filter(t => !t.isHidden);
  const activeTable = tables.find(t => t.symbolicId === selectedTable);
  const tableCols = activeTable ? allColumns.filter(c => c.tableId === activeTable.id && !c.isHidden) : [];

  const queryMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/query`, payload);
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (e: any) => toast({ title: "Query Error", description: e.message, variant: "destructive" }),
  });

  const buildQuery = () => {
    const query: any = { entity: selectedTable, select: selectedCols, limit: Number(limit) };
    if (whereClauses.length > 0) {
      query.where = {};
      for (const wc of whereClauses) {
        if (!wc.sym || !wc.value) continue;
        query.where[wc.sym] = wc.op === "in"
          ? { in: wc.value.split(",").map(v => v.trim()) }
          : { [wc.op]: wc.value };
      }
    }
    return query;
  };

  const handleRun = () => {
    if (activeTab === "raw") {
      try { queryMutation.mutate(JSON.parse(rawJson)); }
      catch { toast({ title: "Invalid JSON", variant: "destructive" }); }
    } else {
      if (!selectedTable || selectedCols.length === 0) {
        toast({ title: "Select a table and at least one column", variant: "destructive" });
        return;
      }
      queryMutation.mutate(buildQuery());
    }
  };

  const toggleCol = (sym: string) =>
    setSelectedCols(prev => prev.includes(sym) ? prev.filter(c => c !== sym) : [...prev, sym]);

  const builtQuery = activeTab === "builder" && selectedTable ? buildQuery() : null;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        crumbs={[
          { label: "Projects", href: "/" },
          { label: project?.name || "Project", href: `/projects/${projectId}` },
          { label: "Query Firewall" },
        ]}
        title="Query Firewall"
        description="Test the semantic JSON→SQL engine. Agents never write raw SQL — only validated JSON."
        icon={<Code2 className="h-5 w-5" />}
        tooltip={{
          what: "An interactive query tester that simulates exactly how an AI agent would query your database — using symbolic JSON instead of raw SQL.",
          why: "Raw SQL is dangerous: it can leak PII, access hidden tables, or run expensive queries. The firewall translates safe JSON into SQL and enforces all access rules.",
          how: "Pick a table, select columns, add optional filters, then click Execute. You'll see the generated SQL and sample results — exactly what an agent would get back.",
        }}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-6 text-sm">
          <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span className="text-muted-foreground text-xs">
            <strong className="text-foreground">Semantic Firewall active.</strong> Agents submit JSON — raw SQL is never exposed. PII columns are automatically masked. Hidden tables/columns are inaccessible.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Builder */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={activeTab === "builder" ? "default" : "outline"} onClick={() => setActiveTab("builder")}>Visual Builder</Button>
              <Button size="sm" variant={activeTab === "raw" ? "default" : "outline"} onClick={() => setActiveTab("raw")}>Raw JSON</Button>
            </div>

            {activeTab === "builder" ? (
              <Card className="border-border/40">
                <CardContent className="pt-4 space-y-4">
                  {/* Table */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Entity (Table)</label>
                    {visibleTables.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Loading tables...</p>
                    ) : (
                      <Select value={selectedTable} onValueChange={(v) => { setSelectedTable(v); setSelectedCols([]); setWhereClauses([]); }}>
                        <SelectTrigger className="h-9 text-sm font-mono">
                          <SelectValue placeholder="Select entity..." />
                        </SelectTrigger>
                        <SelectContent>
                          {visibleTables.map(t => (
                            <SelectItem key={t.id} value={t.symbolicId}>
                              <span className="font-mono text-sm">{t.symbolicId}</span>
                              <span className="text-muted-foreground ml-2 text-xs">· {t.tableName}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Columns */}
                  {activeTable && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Select Columns</label>
                        <button className="text-xs text-primary hover:underline" onClick={() => setSelectedCols(tableCols.map(c => c.symbolicId))}>Select All</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tableCols.map(col => (
                          <button
                            key={col.id}
                            onClick={() => toggleCol(col.symbolicId)}
                            className={cn(
                              "flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors font-mono",
                              selectedCols.includes(col.symbolicId)
                                ? "bg-primary/20 border-primary/40 text-primary"
                                : "bg-secondary/30 border-border/30 text-muted-foreground hover:border-border"
                            )}
                          >
                            {col.isPrimaryKey && <Key className="h-2.5 w-2.5" />}
                            {col.isPii && <Shield className="h-2.5 w-2.5 text-purple-400" />}
                            {col.symbolicId}
                            <span className="text-[10px] opacity-60 ml-0.5">·{col.columnName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Where */}
                  {activeTable && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Where Clauses</label>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setWhereClauses(prev => [...prev, { sym: "", op: "eq", value: "" }])}>
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </div>
                      {whereClauses.map((wc, i) => (
                        <div key={i} className="flex gap-2 mb-2 items-center">
                          <Select value={wc.sym} onValueChange={v => setWhereClauses(prev => prev.map((w, idx) => idx === i ? { ...w, sym: v } : w))}>
                            <SelectTrigger className="h-8 text-xs flex-1 font-mono"><SelectValue placeholder="Column" /></SelectTrigger>
                            <SelectContent>
                              {tableCols.map(c => <SelectItem key={c.id} value={c.symbolicId} className="font-mono text-xs">{c.symbolicId} · {c.columnName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={wc.op} onValueChange={v => setWhereClauses(prev => prev.map((w, idx) => idx === i ? { ...w, op: v } : w))}>
                            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {OPS.map(op => <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input className="h-8 text-xs flex-1" placeholder="value" value={wc.value} onChange={e => setWhereClauses(prev => prev.map((w, idx) => idx === i ? { ...w, value: e.target.value } : w))} />
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setWhereClauses(prev => prev.filter((_, idx) => idx !== i))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Limit */}
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground w-12">Limit</label>
                    <Select value={limit} onValueChange={setLimit}>
                      <SelectTrigger className="h-8 text-xs w-24 font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["10", "25", "50", "100", "200"].map(l => <SelectItem key={l} value={l} className="font-mono text-xs">{l} rows</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/40">
                <CardContent className="pt-4">
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Raw JSON Query</label>
                  <Textarea
                    className="font-mono text-xs h-52 resize-none"
                    placeholder={`{\n  "entity": "T1",\n  "select": ["C1", "C2"],\n  "where": { "C4": { "eq": "active" } },\n  "limit": 50\n}`}
                    value={rawJson}
                    onChange={e => setRawJson(e.target.value)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {builtQuery && selectedCols.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Query Preview</p>
                <JsonHighlight json={builtQuery} />
              </div>
            )}

            <Button className="w-full" onClick={handleRun} disabled={queryMutation.isPending}>
              <Play className="h-4 w-4 mr-2" />
              {queryMutation.isPending ? "Executing..." : "Execute Query"}
            </Button>
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            {result ? (
              <>
                <div className={cn("flex items-center gap-3 p-3 rounded-lg border text-sm",
                  result.error ? "bg-red-500/10 border-red-500/25 text-red-400" : "bg-green-500/10 border-green-500/25 text-green-400"
                )}>
                  {result.error
                    ? <><XCircle className="h-4 w-4 shrink-0" /><span className="font-medium">Error:</span><span>{result.error}</span></>
                    : <><CheckCircle className="h-4 w-4 shrink-0" /><span>{result.rowsReturned} rows returned {result.piiMasked && <span className="text-purple-400">· PII masked</span>}</span></>
                  }
                </div>

                {result.sql && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Generated SQL</p>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { navigator.clipboard.writeText(result.sql); toast({ title: "Copied" }); }}>
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <pre className="code-block text-xs text-cyan-300">{result.sql}</pre>
                  </div>
                )}

                {result.rows && result.rows.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Results</p>
                    <div className="overflow-auto rounded-lg border border-border/40">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="bg-secondary/30">
                            {Object.keys(result.rows[0]).map(k => (
                              <th key={k} className="text-left px-3 py-2 font-mono font-medium text-muted-foreground border-b border-border/30">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                              {Object.values(row).map((v: any, j: number) => (
                                <td key={j} className={cn("px-3 py-2 font-mono", String(v).includes("***") && "text-purple-400")}>
                                  {String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.note && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded bg-secondary/20">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-400" />{result.note}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border border-border/30 rounded-lg border-dashed">
                <Code2 className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm">Build a query and click Execute</p>
                <p className="text-xs mt-1 opacity-60">Results appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
