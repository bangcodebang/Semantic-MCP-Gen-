import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import ProjectView from "@/pages/project-view";
import ManifestView from "@/pages/manifest-view";
import QueryBuilder from "@/pages/query-builder";
import SchemaGraph from "@/pages/schema-graph";
import QueryLogs from "@/pages/query-logs";
import McpWizard from "@/pages/mcp-wizard";
import NotFound from "@/pages/not-found";
import PerplexityAttribution from "@/components/PerplexityAttribution";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects/:id" component={ProjectView} />
      <Route path="/projects/:id/manifest" component={ManifestView} />
      <Route path="/projects/:id/query" component={QueryBuilder} />
      <Route path="/projects/:id/graph" component={SchemaGraph} />
      <Route path="/projects/:id/logs" component={QueryLogs} />
      <Route path="/projects/:id/wizard" component={McpWizard} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          {/* Router wraps EVERYTHING so sidebar Links and page Links share the same router context */}
          <Router hook={useHashLocation}>
            <SidebarProvider style={sidebarStyle as React.CSSProperties}>
              <div className="flex h-screen w-full overflow-hidden">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0">
                  <header className="flex items-center justify-between px-4 h-12 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                      <SidebarTrigger data-testid="button-sidebar-toggle" className="h-8 w-8" />
                      <div className="flex items-center gap-2">
                        {/* Logo */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-label="Semantic MCP Gen" className="text-primary">
                          <circle cx="12" cy="12" r="2" fill="currentColor"/>
                          <circle cx="4" cy="6" r="2" fill="currentColor" opacity="0.7"/>
                          <circle cx="20" cy="6" r="2" fill="currentColor" opacity="0.7"/>
                          <circle cx="4" cy="18" r="2" fill="currentColor" opacity="0.5"/>
                          <circle cx="20" cy="18" r="2" fill="currentColor" opacity="0.5"/>
                          <line x1="12" y1="10" x2="6" y2="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
                          <line x1="12" y1="10" x2="18" y2="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
                          <line x1="12" y1="14" x2="6" y2="16.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                          <line x1="12" y1="14" x2="18" y2="16.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                        </svg>
                        <span className="text-sm font-semibold tracking-tight">Semantic-MCP-Gen</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto">
                    <AppRoutes />
                  </main>
                  <PerplexityAttribution />
                </div>
              </div>
            </SidebarProvider>
          </Router>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
