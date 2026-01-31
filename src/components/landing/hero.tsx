import Link from "next/link";
import { Button } from "../ui/button";
import { CircleDot } from "lucide-react";

export function Hero() {
  return (
    <section className="py-20 md:py-32">
      <div className="container flex flex-col items-center text-center gap-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary">
          <CircleDot className="h-4 w-4" />
          Built on Stacks
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
          Build Credit Through{" "}
          <span className="text-primary">Community</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
          Join lending circles, make on-time payments, and build a transparent
          on-chain credit score (300-850) on the Stacks blockchain.
        </p>
        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link href="/signin">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">Learn More</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
