import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, DbTable, DbColumn, DbRelationship } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Database, ArrowRight, Link, Link2Off, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

const DOMAIN_COLORS: Record<string, string> = {
  Users: "border-blue-500/50 bg-blue-500/5",
  Sales: "border-green-500/50 bg-green-500/5",
  Catalog: "border-orange-500/50 bg-orange-500/5",
  Finance: "border-yellow-500/50 bg-yellow-500/5",
  System: "border-red-500/50 bg-red-500/5",
  General: "border-border bg-secondary/10",
};

const DOMAIN_DOT: Record<string, string> = {
  Users: "bg-blue-400",
  Sales: "bg-green-400",
  Catalog: "bg-orange-400",
  Finance: "bg-yellow-400",
  System: "bg-red-400",
  General: "bg-gray-400",
};

export default function SchemaGraph() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: project } = useQuery<Project>({ queryKey: ["/api/projects", projectId] });
  const { data: tables = [], isLoading: tablesLoading } = useQuery<DbTable[]>({ queryKey: [`/api/projects/${projectId}/tables`] });
  const { data: columns = [] } = useQuery<DbColumn[]>({ queryKey: [`/api/projects/${projectId}/columns`] });
  const { data: relationships = [], isLoading: relsLoading } = useQuery<DbRelationship[]>({ queryKey: [`/api/projects/${projectId}/relationships`] });

  const toggleRel = useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      apiRequest("PATCH", `/api/relationships/${id}`, { isEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/relationships`] }),
  });

  // Group tables by domain
  const domains = Array.from(new Set(tables.map(t => t.domain)));
  const tablesByDomain = domains.reduce((acc, d) => {
    acc[d] = tables.filter(t => t.domain === d);
    return acc;
  }, {} as Record<string, DbTable[]>);

  const getTable = (id: number) => tables.find(t => t.id === id);
  const getColumn = (id: number) => columns.find(c => c.id === id);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        crumbs={[
          { label: "Projects", href: "/" },
          { label: project?.name || "Project", href: `/projects/${projectId}` },
          { label: "Relation Graph" },
        ]}
        title="Relation Graph"
        description="Foreign key relationships and domain structure. Enable/disable join paths for the AI agent."
        icon={<GitBranch className="h-5 w-5" />}
        tooltip={{
          what: "A visual map of all your database tables grouped by domain, plus a list of foreign key (FK) relationships that link them together.",
          why: "AI agents use join paths to answer multi-table questions like 'show me orders with the customer name'. Disabling a join prevents the agent from using that path.",
          how: "Review the join paths on the right. Toggle any relationship on/off using the switch. Disabled joins are excluded from the Semantic Manifest the agent reads.",
        }}
      />

      <div className="flex-1 overflow-auto p-6">
        {tablesLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-lg bg-secondary/20 animate-pulse" />)}
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-secondary/20 animate-pulse" />)}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Domain map */}
            <div className="xl:col-span-2 space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4" /> Domain Map
              </h2>
              {domains.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border/30 rounded-lg">
                  <Database className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>No tables found</p>
                </div>
              ) : (
                domains.map(domain => (
                  <div key={domain}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("w-2 h-2 rounded-full", DOMAIN_DOT[domain] || "bg-gray-400")} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{domain}</span>
                      <span className="text-xs text-muted-foreground">({tablesByDomain[domain].length} tables)</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-4">
                      {tablesByDomain[domain].map(table => {
                        const cols = columns.filter(c => c.tableId === table.id);
                        const pkCols = cols.filter(c => c.isPrimaryKey);
                        const fkCols = cols.filter(c => c.isForeignKey);
                        const piiCols = cols.filter(c => c.isPii);
                        return (
                          <Card
                            key={table.id}
                            className={cn("border text-xs", DOMAIN_COLORS[domain] || DOMAIN_COLORS.General, table.isHidden && "opacity-40")}
                            data-testid={`card-graph-table-${table.id}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <code className="font-mono font-semibold text-sm">{table.tableName}</code>
                                  <div className="text-muted-foreground font-mono text-[10px] mt-0.5">{table.symbolicId}</div>
                                </div>
                                {table.isCore && <Badge variant="outline" className="text-[10px] h-4 px-1">core</Badge>}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {pkCols.length > 0 && <span className="tag-pk text-[10px] px-1 py-0 rounded">{pkCols.length} PK</span>}
                                {fkCols.length > 0 && <span className="tag-fk text-[10px] px-1 py-0 rounded">{fkCols.length} FK</span>}
                                {piiCols.length > 0 && <span className="tag-pii text-[10px] px-1 py-0 rounded">{piiCols.length} PII</span>}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-2">{(table.rowCount / 1000).toFixed(0)}K rows · {cols.length} cols</div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* FK Relationships panel */}
            <div>
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
                <Link className="h-4 w-4" /> Join Paths ({relationships.length})
              </h2>
              <div className="space-y-2">
                {relsLoading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-secondary/20 animate-pulse" />)
                ) : relationships.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/30 rounded-lg">
                    <Link2Off className="h-6 w-6 mx-auto mb-2 opacity-30" />
                    No relationships found
                  </div>
                ) : (
                  relationships.map(rel => {
                    const fromTable = getTable(rel.fromTableId);
                    const toTable = getTable(rel.toTableId);
                    const fromCol = getColumn(rel.fromColumnId);
                    const toCol = getColumn(rel.toColumnId);
                    return (
                      <Card key={rel.id} className={cn("border-border/40", !rel.isEnabled && "opacity-50")} data-testid={`card-rel-${rel.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              {rel.label && (
                                <p className="text-xs font-medium mb-1 text-foreground/80">{rel.label}</p>
                              )}
                              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground flex-wrap">
                                <span className="text-blue-400">{fromTable?.tableName}</span>
                                <span className="opacity-60">.{fromCol?.columnName}</span>
                                <ArrowRight className="h-3 w-3 shrink-0" />
                                <span className="text-green-400">{toTable?.tableName}</span>
                                <span className="opacity-60">.{toCol?.columnName}</span>
                              </div>
                            </div>
                            <Switch
                              checked={rel.isEnabled}
                              onCheckedChange={enabled => toggleRel.mutate({ id: rel.id, isEnabled: enabled })}
                              data-testid={`switch-rel-${rel.id}`}
                              className="shrink-0 ml-2"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className={cn("px-1.5 py-0.5 rounded border text-[10px]",
                              rel.isEnabled ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 border-gray-500/20"
                            )}>
                              {rel.isEnabled ? "Enabled for agent" : "Disabled"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Mermaid-style path legend */}
              {relationships.filter(r => r.isEnabled).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Mermaid Graph
                  </p>
                  <pre className="code-block text-[10px] text-green-400/80 leading-relaxed">
{`graph LR
${relationships.filter(r => r.isEnabled).map(r => {
  const ft = getTable(r.fromTableId);
  const tt = getTable(r.toTableId);
  return `  ${ft?.tableName} -->|${r.label || 'FK'}| ${tt?.tableName}`;
}).join('\n')}`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
