import Link from "next/link";
import { Button } from "../ui/button";

export function CTASection() {
  return (
    <section className="py-20 px-4 border-t border-white/10">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Build Your Credit?
        </h2>
        <p className="text-neutral-400 mb-8">
          Join thousands of users building verifiable credit scores through
          community lending.
        </p>
        <Button size="lg" className="min-w-[200px]" asChild>
          <Link href="/signin">Get Started Free</Link>
        </Button>
      </div>
    </section>
  );
}
