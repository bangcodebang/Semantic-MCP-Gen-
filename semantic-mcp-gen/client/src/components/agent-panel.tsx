import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2, KeyRound, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentPanelProps {
  projectId: number;
  tableCount: number;
}

export function AgentPanel({ projectId, tableCount }: AgentPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lastResult, setLastResult] = useState<{ updatedTables: number; updatedColumns: number; message: string } | null>(null);

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/agent/enrich`, {
        provider,
        apiKey,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: "Agent error", description: data.error, variant: "destructive" });
        return;
      }
      setLastResult(data);
      // Invalidate tables and columns so UI reflects new descriptions
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tables`] });
      qc.invalidateQueries({ queryKey: [`/api/projects/${projectId}/columns`] });
      toast({ title: "Schema enriched", description: data.message });
    },
    onError: (e: any) => {
      toast({ title: "Agent failed", description: e.message, variant: "destructive" });
    },
  });

  const canRun = apiKey.length >= 10 && !enrichMutation.isPending;

  const providerInfo = {
    openai: { label: "OpenAI", model: "gpt-4o-mini", hint: "sk-..." },
    anthropic: { label: "Anthropic", model: "claude-3.5-haiku", hint: "sk-ant-..." },
  };

  return (
    <Card className="border-primary/30 bg-primary/5 overflow-hidden" data-testid="agent-panel">
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/20 text-primary shrink-0">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">AI Schema Agent</p>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-write descriptions, domains & PII flags</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastResult && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {lastResult.updatedTables}T · {lastResult.updatedColumns}C enriched
            </span>
          )}
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <CardContent className="px-4 pb-4 pt-0 border-t border-primary/15 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed pt-3">
            Paste your API key below. The agent will read your <strong className="text-foreground">{tableCount} tables</strong> and
            automatically write business descriptions, assign domain tags, and detect PII columns — saving hours of manual work.
            Your key is never stored and only used for this request.
          </p>

          {/* Provider selector */}
          <div className="flex gap-2">
            <Select value={provider} onValueChange={(v: "openai" | "anthropic") => setProvider(v)}>
              <SelectTrigger className="h-9 w-36 text-sm" data-testid="select-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">OpenAI</span>
                    <span className="text-xs text-muted-foreground">gpt-4o-mini</span>
                  </span>
                </SelectItem>
                <SelectItem value="anthropic">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">Anthropic</span>
                    <span className="text-xs text-muted-foreground">claude-haiku</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type={showKey ? "text" : "password"}
                placeholder={providerInfo[provider].hint}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="pl-8 pr-9 h-9 text-sm font-mono"
                data-testid="input-api-key"
              />
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowKey(s => !s)}
                type="button"
                data-testid="button-toggle-key-visibility"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Run button */}
          <Button
            className="w-full gap-2"
            onClick={() => enrichMutation.mutate()}
            disabled={!canRun}
            data-testid="button-run-agent"
          >
            {enrichMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enriching schema with AI...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Auto-Enrich {tableCount} Tables</>
            )}
          </Button>

          {/* Success result */}
          {lastResult && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
              <span className="text-green-400">{lastResult.message}</span>
            </div>
          )}

          {/* Error state */}
          {enrichMutation.isError && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <span className="text-red-400">{(enrichMutation.error as any)?.message}</span>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/60 text-center">
            Key is used once for this request only · Never stored server-side
          </p>
        </CardContent>
      )}
    </Card>
  );
}
