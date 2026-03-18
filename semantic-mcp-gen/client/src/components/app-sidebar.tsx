import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Database, Code2, GitBranch, FileJson, ScrollText, Rocket,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function StatusDot({ status }: { status: string }) {
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full shrink-0",
      status === "ready" ? "bg-green-400" :
      status === "enriching" ? "bg-yellow-400 animate-pulse" :
      status === "introspecting" ? "bg-blue-400 animate-pulse" :
      "bg-gray-500"
    )} />
  );
}

export function AppSidebar() {
  const [location] = useHashLocation();
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const projectMatch = location.match(/^\/projects\/(\d+)/);
  const activeProjectId = projectMatch ? Number(projectMatch[1]) : null;
  const activeProject = projects.find(p => p.id === activeProjectId);

  const navItems = activeProjectId ? [
    { href: `/projects/${activeProjectId}`, icon: Database, label: "Schema & Enrichment" },
    { href: `/projects/${activeProjectId}/graph`, icon: GitBranch, label: "Relation Graph" },
    { href: `/projects/${activeProjectId}/query`, icon: Code2, label: "Query Firewall" },
    { href: `/projects/${activeProjectId}/manifest`, icon: FileJson, label: "Manifest" },
    { href: `/projects/${activeProjectId}/logs`, icon: ScrollText, label: "Query Logs" },
    { href: `/projects/${activeProjectId}/wizard`, icon: Rocket, label: "MCP Wizard", highlight: true },
  ] : [];

  return (
    <Sidebar>
      <SidebarHeader className="p-3 pb-0">
        <div className="flex items-center gap-2 px-2 py-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-primary shrink-0">
            <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
            <circle cx="4" cy="6" r="2" fill="currentColor" opacity="0.6"/>
            <circle cx="20" cy="6" r="2" fill="currentColor" opacity="0.6"/>
            <circle cx="4" cy="18" r="2" fill="currentColor" opacity="0.4"/>
            <circle cx="20" cy="18" r="2" fill="currentColor" opacity="0.4"/>
            <line x1="11.5" y1="9.8" x2="5.5" y2="7.2" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
            <line x1="12.5" y1="9.8" x2="18.5" y2="7.2" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
            <line x1="11.5" y1="14.2" x2="5.5" y2="16.8" stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
            <line x1="12.5" y1="14.2" x2="18.5" y2="16.8" stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
          </svg>
          <div>
            <p className="text-sm font-semibold tracking-tight leading-none">Semantic-MCP-Gen</p>
            <p className="text-xs text-muted-foreground mt-0.5">v1.0 · AI DB Bridge</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"} data-testid="nav-dashboard">
                  <Link href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>All Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Active project nav */}
        {activeProject && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2 truncate">
                <StatusDot status={activeProject.status} />
                <span className="truncate">{activeProject.name}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map(item => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.href}
                        data-testid={`nav-${item.label}`}
                        className={(item as any).highlight ? "text-primary hover:text-primary" : ""}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                          {(item as any).highlight && (
                            <span className="ml-auto text-[9px] font-semibold bg-primary/20 text-primary px-1 py-0.5 rounded">NEW</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Projects list */}
        {projects.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projects.map(p => (
                    <SidebarMenuItem key={p.id}>
                      <SidebarMenuButton asChild isActive={activeProjectId === p.id} data-testid={`nav-project-${p.id}`}>
                        <Link href={`/projects/${p.id}`}>
                          <StatusDot status={p.status} />
                          <span className="truncate">{p.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">{p.tableCount}t</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-xs text-muted-foreground text-center">
          Semantic MCP Gen · by Rohit
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
