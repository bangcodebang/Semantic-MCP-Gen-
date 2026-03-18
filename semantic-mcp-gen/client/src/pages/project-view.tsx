import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, DbTable, DbColumn } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Database, Eye, EyeOff, Key, Link, Shield, ChevronDown, ChevronRight,
  Wand2, Pencil, Check, X, Activity, AlertTriangle, Search, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { AgentPanel } from "@/components/agent-panel";

function DomainBadge({ domain }: { domain: string }) {
  const colors: Record<string, string> = {
    Users: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Sales: "bg-green-500/10 text-green-400 border-green-500/20",
    Catalog: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Finance: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    System: "bg-red-500/10 text-red-400 border-red-500/20",
    General: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  return (
    <span className={cn("text-xs px-1.5 py-0.5 rounded border font-medium", colors[domain] || colors.General)}>
      {domain}
    </span>
  );
}

function ColumnRow({ col, onUpdate }: { col: DbColumn; onUpdate: (id: number, data: Partial<DbColumn>) => void }) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(col.description);

  return (
    <div className={cn("flex items-start gap-3 py-2.5 px-3 rounded-lg group hover:bg-secondary/30 transition-colors", col.isHidden && "opacity-50")} data-testid={`row-column-${col.id}`}>
      <div className="flex items-center gap-1.5 shrink-0 w-32 pt-0.5">
        <code className="text-xs font-mono text-foreground/80 truncate">{col.columnName}</code>
      </div>
      <div className="flex items-center gap-1 shrink-0 w-28">
        <code className="text-xs font-mono text-muted-foreground truncate">{col.dataType}</code>
      </div>
      <div className="flex gap-1 shrink-0 w-20">
        {col.isPrimaryKey && <span className="tag-pk text-xs px-1 py-0 rounded">PK</span>}
        {col.isForeignKey && <span className="tag-fk text-xs px-1 py-0 rounded">FK</span>}
        {col.isPii && <span className="tag-pii text-xs px-1 py-0 rounded">PII</span>}
        {col.isHidden && <span className="tag-hidden text-xs px-1 py-0 rounded">H</span>}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="h-7 text-xs"
              placeholder="Describe this column..."
              data-testid={`input-col-desc-${col.id}`}
            />
            <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => { onUpdate(col.id, { description: desc }); setEditing(false); }}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setDesc(col.description); setEditing(false); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground truncate">
              {col.description || <span className="text-muted-foreground/50 italic">No description</span>}
            </span>
            {col.sampleValues && col.sampleValues.length > 0 && (
              <div className="flex gap-1 shrink-0">
                {col.sampleValues.slice(0, 3).map((v, i) => (
                  <code key={i} className="text-xs bg-secondary/50 px-1 rounded text-muted-foreground">{v}</code>
                ))}
                {col.sampleValues.length > 3 && <span className="text-xs text-muted-foreground">+{col.sampleValues.length - 3}</span>}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Controls */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)} data-testid={`button-edit-col-${col.id}`}>
          <Pencil className="h-3 w-3" />
        </Button>
        <button
          className="flex items-center"
          title={col.isPii ? "PII — will be masked" : "Mark as PII"}
          onClick={() => onUpdate(col.id, { isPii: !col.isPii })}
          data-testid={`button-pii-${col.id}`}
        >
          <Shield className={cn("h-3.5 w-3.5 transition-colors", col.isPii ? "text-purple-400" : "text-muted-foreground/40 hover:text-muted-foreground")} />
        </button>
        <button
          title={col.isHidden ? "Show column" : "Hide from agent"}
          onClick={() => onUpdate(col.id, { isHidden: !col.isHidden })}
          data-testid={`button-hide-col-${col.id}`}
        >
          {col.isHidden
            ? <EyeOff className="h-3.5 w-3.5 text-red-400" />
            : <Eye className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
          }
        </button>
      </div>
    </div>
  );
}

function TableRow({ table, allColumns, onUpdateTable, onUpdateColumn }: {
  table: DbTable;
  allColumns: DbColumn[];
  onUpdateTable: (id: number, data: Partial<DbTable>) => void;
  onUpdateColumn: (id: number, data: Partial<DbColumn>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(table.description);
  const [editingDomain, setEditingDomain] = useState(false);
  const [domain, setDomain] = useState(table.domain);
  const cols = allColumns.filter(c => c.tableId === table.id);
  const piiCount = cols.filter(c => c.isPii).length;
  const hiddenCount = cols.filter(c => c.isHidden).length;

  return (
    <Card className={cn("border-border/40 overflow-hidden", table.isHidden && "opacity-60")} data-testid={`card-table-${table.id}`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
        data-testid={`button-expand-table-${table.id}`}
      >
        <div className="shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="shrink-0">
          <Database className="h-4 w-4 text-primary/70" />
        </div>
        <code className="text-sm font-mono font-medium">{table.tableName}</code>
        <span className="text-xs text-muted-foreground font-mono">{table.symbolicId}</span>
        <DomainBadge domain={table.domain} />
        {table.isCore && <Badge variant="outline" className="text-xs h-4 px-1.5">core</Badge>}
        {table.isHidden && <span className="tag-hidden text-xs px-1.5 py-0.5 rounded">hidden</span>}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {piiCount > 0 && <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-purple-400" />{piiCount} PII</span>}
          {hiddenCount > 0 && <span className="flex items-center gap-1"><EyeOff className="h-3 w-3 text-red-400" />{hiddenCount} hidden</span>}
          <span>{cols.length} cols</span>
          <span>{(table.rowCount / 1000).toFixed(1)}K rows</span>
          <button
            className="ml-2"
            title={table.isHidden ? "Show table" : "Hide table from agent"}
            onClick={e => { e.stopPropagation(); onUpdateTable(table.id, { isHidden: !table.isHidden }); }}
            data-testid={`button-hide-table-${table.id}`}
          >
            {table.isHidden
              ? <EyeOff className="h-3.5 w-3.5 text-red-400" />
              : <Eye className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
            }
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/30">
          {/* Description & Domain */}
          <div className="px-4 py-3 bg-secondary/10 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <p className="text-xs font-medium text-muted-foreground mb-1">Business Description</p>
              {editingDesc ? (
                <div className="flex gap-2">
                  <Input value={desc} onChange={e => setDesc(e.target.value)} className="h-7 text-xs flex-1" data-testid={`input-table-desc-${table.id}`} />
                  <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => { onUpdateTable(table.id, { description: desc }); setEditingDesc(false); }}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setDesc(table.description); setEditingDesc(false); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/d">
                  <p className="text-xs text-foreground/70">{table.description || <span className="text-muted-foreground/50 italic">No description</span>}</p>
                  <button onClick={() => setEditingDesc(true)} data-testid={`button-edit-table-${table.id}`}>
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/d:opacity-100 transition-opacity" />
                  </button>
                </div>
              )}
            </div>
            <div className="w-36">
              <p className="text-xs font-medium text-muted-foreground mb-1">Domain</p>
              {editingDomain ? (
                <div className="flex gap-1">
                  <Input value={domain} onChange={e => setDomain(e.target.value)} className="h-7 text-xs" data-testid={`input-table-domain-${table.id}`} />
                  <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => { onUpdateTable(table.id, { domain }); setEditingDomain(false); }}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group/dom">
                  <DomainBadge domain={table.domain} />
                  <button onClick={() => setEditingDomain(true)}>
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/dom:opacity-100 transition-opacity" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Column headers */}
          <div className="flex gap-3 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/20 bg-secondary/5">
            <span className="w-32">Column</span>
            <span className="w-28">Type</span>
            <span className="w-20">Tags</span>
            <span className="flex-1">Description / Sample Values</span>
          </div>
          {/* Columns */}
          <div className="divide-y divide-border/10">
            {cols.map(col => (
              <ColumnRow key={col.id} col={col} onUpdate={onUpdateColumn} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ProjectView() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");

  const { data: project } = useQuery<Project>({ queryKey: ["/api/projects", projectId] });
  const { data: tables = [], isLoading: tablesLoading } = useQuery<DbTable[]>({ queryKey: [`/api/projects/${projectId}/tables`] });
  const { data: columns = [] } = useQuery<DbColumn[]>({ queryKey: [`/api/projects/${projectId}/columns`] });

  const updateTable = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DbTable> }) => apiRequest("PATCH", `/api/tables/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tables`] }),
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const updateColumn = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DbColumn> }) => apiRequest("PATCH", `/api/columns/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/columns`] }),
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const domains = ["all", ...Array.from(new Set(tables.map(t => t.domain)))];
  const filtered = tables.filter(t => {
    const matchSearch = !search || t.tableName.includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchDomain = domainFilter === "all" || t.domain === domainFilter;
    return matchSearch && matchDomain;
  });

  const totalPii = columns.filter(c => c.isPii).length;
  const totalHidden = tables.filter(t => t.isHidden).length;
  const enriched = tables.filter(t => t.description.length > 0).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        crumbs={[
          { label: "Projects", href: "/" },
          { label: project?.name || "Project" },
        ]}
        title={project?.name || "Loading..."}
        description={project?.description || ""}
        icon={<Database className="h-5 w-5" />}
        tooltip={{
          what: "This page shows every table and column in your database. You can add business descriptions, assign domain tags, mark PII columns, and hide tables from the AI agent.",
          why: "AI agents need semantic context to query your data correctly. Without descriptions, an agent seeing 'usr_acct_ref_id' has no idea it's a customer account identifier.",
          how: "Expand any table to see its columns. Edit descriptions inline, toggle PII/hidden flags, or use the AI Agent panel at the top to auto-fill everything in one click.",
        }}
        actions={
          <span className="text-xs font-mono text-muted-foreground uppercase bg-secondary/50 px-2 py-1 rounded">
            {project?.dbType}
          </span>
        }
      />

      <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full">

        {/* AI Agent Panel */}
        <div className="mb-6">
          <AgentPanel projectId={projectId} tableCount={tables.length} />
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap gap-4 mb-6 p-3 rounded-lg bg-card border border-border/40">
        <div className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-primary" />
          <span className="font-mono font-medium">{tables.length}</span>
          <span className="text-muted-foreground">tables</span>
        </div>
        <div className="text-border/50">|</div>
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-green-400" />
          <span className="font-mono font-medium">{enriched}</span>
          <span className="text-muted-foreground">enriched</span>
        </div>
        <div className="text-border/50">|</div>
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-purple-400" />
          <span className="font-mono font-medium">{totalPii}</span>
          <span className="text-muted-foreground">PII columns</span>
        </div>
        <div className="text-border/50">|</div>
        <div className="flex items-center gap-2 text-sm">
          <EyeOff className="h-4 w-4 text-red-400" />
          <span className="font-mono font-medium">{totalHidden}</span>
          <span className="text-muted-foreground">hidden tables</span>
        </div>
          <div className="ml-auto">
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">Enrichment</div>
              <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${tables.length ? (enriched / tables.length) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-mono">{tables.length ? Math.round((enriched / tables.length) * 100) : 0}%</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground">Tags:</span>
          <span className="tag-pk text-xs px-1.5 py-0.5 rounded">PK = Primary Key</span>
          <span className="tag-fk text-xs px-1.5 py-0.5 rounded">FK = Foreign Key</span>
          <span className="tag-pii text-xs px-1.5 py-0.5 rounded">PII = Masked from agent</span>
          <span className="tag-hidden text-xs px-1.5 py-0.5 rounded">H = Hidden</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-tables"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {domains.map(d => (
              <Button
                key={d}
                size="sm"
                variant={domainFilter === d ? "default" : "ghost"}
                className="h-8 text-xs"
                onClick={() => setDomainFilter(d)}
                data-testid={`button-filter-${d}`}
              >
                {d === "all" ? "All" : d}
              </Button>
            ))}
          </div>
        </div>

        {/* Tables */}
        <div className="space-y-2">
          {tablesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-secondary/20 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No tables found</p>
            </div>
          ) : (
            filtered.map(table => (
              <TableRow
                key={table.id}
                table={table}
                allColumns={columns}
                onUpdateTable={(id, data) => updateTable.mutate({ id, data })}
                onUpdateColumn={(id, data) => updateColumn.mutate({ id, data })}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
