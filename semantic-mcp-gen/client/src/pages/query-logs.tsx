import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { QueryLog, Project } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, CheckCircle, XCircle, Clock, Database, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

export default function QueryLogs() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const { data: project } = useQuery<Project>({ queryKey: ["/api/projects", projectId] });
  const { data: logs = [], isLoading } = useQuery<QueryLog[]>({
    queryKey: [`/api/projects/${projectId}/logs`],
    refetchInterval: 10000,
  });

  const successCount = logs.filter(l => l.status === "success").length;
  const errorCount = logs.filter(l => l.status === "error").length;
  const totalRows = logs.filter(l => l.status === "success").reduce((a, l) => a + l.rowsReturned, 0);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        crumbs={[
          { label: "Projects", href: "/" },
          { label: project?.name || "Project", href: `/projects/${projectId}` },
          { label: "Query Logs" },
        ]}
        title="Query Logs"
        description="All semantic queries executed through the firewall — success and blocked attempts."
        icon={<ScrollText className="h-5 w-5" />}
        tooltip={{
          what: "A real-time audit trail of every query sent through the Semantic Firewall — both successful queries and blocked/rejected attempts.",
          why: "Full observability over what your AI agents are asking. If an agent is trying to access hidden tables or malformed queries, you'll see it here immediately.",
          how: "Each log entry shows the input JSON, the generated SQL, and whether it succeeded or was blocked. Use this to debug agent behavior and verify security rules are working.",
        }}
        actions={
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> Auto-refreshes every 10s
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        {/* Summary */}
        <div className="flex flex-wrap gap-4 mb-6 p-3 rounded-lg bg-card border border-border/40">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="font-mono font-medium">{successCount}</span>
            <span className="text-muted-foreground">successful</span>
          </div>
          <div className="text-border/50">|</div>
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="h-4 w-4 text-red-400" />
            <span className="font-mono font-medium">{errorCount}</span>
            <span className="text-muted-foreground">blocked/failed</span>
          </div>
          <div className="text-border/50">|</div>
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-blue-400" />
            <span className="font-mono font-medium">{totalRows}</span>
            <span className="text-muted-foreground">rows returned total</span>
          </div>
        </div>

        {/* Logs */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-secondary/20 animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border/30 rounded-lg">
            <ScrollText className="h-8 w-8 mb-3 opacity-30" />
            <p>No queries yet</p>
            <p className="text-xs mt-1 opacity-60">Execute a query from the Query Firewall to see logs here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <Card key={log.id} className={cn("border-border/40 overflow-hidden", log.status === "error" && "border-red-500/20")} data-testid={`card-log-${log.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 p-3">
                    {/* Status icon */}
                    <div className="shrink-0 mt-0.5">
                      {log.status === "success"
                        ? <CheckCircle className="h-4 w-4 text-green-400" />
                        : <XCircle className="h-4 w-4 text-red-400" />
                      }
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded border font-medium",
                          log.status === "success"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {log.status === "success" ? "OK" : "BLOCKED"}
                        </span>
                        {log.status === "success" && (
                          <span className="text-xs text-muted-foreground">
                            <span className="font-mono font-medium text-foreground">{log.rowsReturned}</span> rows
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(log.executedAt), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Query JSON */}
                      <div className="flex gap-3 flex-wrap">
                        <div className="flex-1 min-w-48">
                          <p className="text-[10px] text-muted-foreground mb-1 font-medium">INPUT JSON</p>
                          <pre className="text-[11px] font-mono bg-secondary/20 rounded p-2 overflow-auto">
                            {JSON.stringify(log.queryJson, null, 1)}
                          </pre>
                        </div>
                        {log.generatedSql && (
                          <div className="flex-1 min-w-48">
                            <p className="text-[10px] text-muted-foreground mb-1 font-medium">GENERATED SQL</p>
                            <pre className="text-[11px] font-mono text-cyan-400 bg-secondary/20 rounded p-2 overflow-auto">
                              {log.generatedSql}
                            </pre>
                          </div>
                        )}
                        {log.errorMessage && (
                          <div className="flex-1 min-w-48">
                            <p className="text-[10px] text-muted-foreground mb-1 font-medium">ERROR</p>
                            <p className="text-xs text-red-400 bg-red-500/5 rounded p-2">{log.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
