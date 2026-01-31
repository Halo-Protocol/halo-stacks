import Link from "next/link";
import { CircleDot } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-primary" />
          <span>Halo Protocol</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <a
            href="https://github.com/halo-protocol/halo-stacks"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
