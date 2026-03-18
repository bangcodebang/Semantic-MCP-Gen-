import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 text-muted-foreground p-8">
      <p className="text-lg font-mono text-primary mb-2">404</p>
      <p className="text-sm mb-4">Page not found</p>
      <Button asChild size="sm" variant="outline">
        <Link href="/"><Home className="h-4 w-4 mr-2" /> Go Home</Link>
      </Button>
    </div>
  );
}
