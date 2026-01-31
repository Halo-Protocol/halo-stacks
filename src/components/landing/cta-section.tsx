import Link from "next/link";
import { Button } from "../ui/button";

export function CTASection() {
  return (
    <section className="py-20">
      <div className="container text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Build Your Credit?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Join Halo Protocol today and start building a portable, transparent
          credit history on the blockchain.
        </p>
        <Button size="lg" asChild>
          <Link href="/signin">Get Started</Link>
        </Button>
      </div>
    </section>
  );
}
