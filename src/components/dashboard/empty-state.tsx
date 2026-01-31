import Link from "next/link";
import { Button } from "../ui/button";
import { CircleDot, Plus } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CircleDot className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-medium mb-2">No circles yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Create your first lending circle or join one with an invite link to
        start building your credit score.
      </p>
      <Button asChild>
        <Link href="/circles/create">
          <Plus className="h-4 w-4 mr-2" />
          Create Circle
        </Link>
      </Button>
    </div>
  );
}
