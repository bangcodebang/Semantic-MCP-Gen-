import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import type { Project } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Database, Zap, Shield, Search, Activity, Layers, GitBranch, ArrowRight, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ready: "bg-green-500/15 text-green-400 border-green-500/25",
    enriching: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    introspecting: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    draft: "bg-gray-500/15 text-gray-400 border-gray-500/25",
  };
  const labels: Record<string, string> = {
    ready: "Ready", enriching: "Enriching", introspecting: "Introspecting", draft: "Draft"
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[status] || variants.draft}`}>
      {labels[status] || status}
    </span>
  );
}

export default function Dashboard() {
  const [, navigate] = useHashLocation();
  const { data: projects = [], isLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", dbType: "postgresql", connectionString: "" });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/projects", data),
    onSuccess: async (res) => {
      const project = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setOpen(false);
      setForm({ name: "", description: "", dbType: "postgresql", connectionString: "" });
      toast({ title: "Project created", description: "Navigate to Schema & Enrichment to start introspection." });
      navigate(`/projects/${project.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
  });

  const stats = [
    { label: "Total Projects", value: projects.length, icon: Layers, color: "text-primary" },
    { label: "Ready", value: projects.filter(p => p.status === "ready").length, icon: Zap, color: "text-green-400" },
    { label: "Total Tables", value: projects.reduce((a, p) => a + p.tableCount, 0), icon: Database, color: "text-blue-400" },
    { label: "Secured", value: projects.filter(p => p.status === "ready").length, icon: Shield, color: "text-purple-400" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Semantic bridges between databases and AI agents</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-project" size="sm">
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Database Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" data-testid="input-project-name" placeholder="e.g. Production E-Commerce DB" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" data-testid="input-project-desc" placeholder="What does this database store?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
              </div>
              <div>
                <Label htmlFor="dbtype">Database Type</Label>
                <Select value={form.dbType} onValueChange={v => setForm(f => ({ ...f, dbType: v }))}>
                  <SelectTrigger id="dbtype" className="mt-1" data-testid="select-db-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="sqlite">SQLite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="conn">Connection String</Label>
                <Input id="conn" data-testid="input-connection-string" type="password" placeholder="postgresql://user:pass@host:5432/db" value={form.connectionString} onChange={e => setForm(f => ({ ...f, connectionString: e.target.value }))} className="mt-1 font-mono text-xs" />
              </div>
              <Button className="w-full" data-testid="button-create-project" disabled={!form.name || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features overview (empty state) */}
      {projects.length === 0 && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Database, title: "Schema Introspection", desc: "Auto-discovers tables, columns, FK relationships, and samples distinct values from your database.", color: "text-blue-400" },
            { icon: Shield, title: "Semantic Firewall", desc: "Agents never write raw SQL. JSON-to-SQL translation with PII masking, row caps, and column-level access control.", color: "text-purple-400" },
            { icon: Search, title: "Anti-Bloat Discovery", desc: "list_domains(), search_metadata(), get_details() — hierarchical tools that prevent 1000-table context overflow.", color: "text-cyan-400" },
          ].map(f => (
            <Card key={f.title} className="border-border/50 bg-card/50">
              <CardContent className="pt-5">
                <f.icon className={`h-5 w-5 ${f.color} mb-3`} />
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Card key={i} className="h-40 animate-pulse bg-secondary/20 border-border/30" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => (
            <Card key={project.id} className="border-border/50 hover-elevate cursor-pointer group" onClick={() => navigate(`/projects/${project.id}`)} data-testid={`card-project-${project.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-primary/10">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{project.name}</CardTitle>
                      <span className="text-xs text-muted-foreground font-mono uppercase">{project.dbType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={project.status} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-delete-project-${project.id}`}
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate(project.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Database className="h-3 w-3" />{project.tableCount} tables</span>
                    <span>· {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add new card */}
          <Card className="border-border/50 border-dashed hover-elevate cursor-pointer" onClick={() => setOpen(true)} data-testid="card-new-project">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-32 text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-6 w-6 mb-2" />
              <span className="text-sm">Add Database</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
