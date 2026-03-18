import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  crumbs: Crumb[];
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Tooltip content — shown when user clicks the ℹ icon */
  tooltip?: {
    what: string;      // What is this page?
    why: string;       // Why does it matter?
    how: string;       // What should I do here?
  };
}

export function PageHeader({ crumbs, title, description, icon, actions, tooltip }: PageHeaderProps) {
  return (
    <div className="border-b border-border/40 bg-card/30 px-6 py-4 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors cursor-pointer">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Back button */}
          {crumbs.length > 1 && crumbs[crumbs.length - 2].href && (
            <Link href={crumbs[crumbs.length - 2].href!}>
              <button className="flex items-center justify-center h-7 w-7 rounded-md border border-border/50 hover:bg-secondary/50 transition-colors shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </Link>
          )}
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight leading-none">{title}</h1>
              {/* Info tooltip */}
              {tooltip && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                      data-testid={`tooltip-${title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="start" className="w-80 p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">What is this?</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tooltip.what}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Why it matters</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tooltip.why}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">What to do here</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tooltip.how}</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
