import Link from "next/link";
import { Button } from "../ui/button";

export function Hero() {
  return (
    <section className="relative pt-16 pb-20 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-neutral-400">
            Now live on Stacks Testnet
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Build Credit
          <br />
          <span className="text-gradient">Through Community</span>
        </h1>

        <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
          Join lending circles, make contributions, and build a verifiable
          credit score on the Stacks blockchain. Access financial opportunities
          you deserve.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="min-w-[200px]" asChild>
            <Link href="/signin">Get Started</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-w-[200px] border-white/30 text-white hover:bg-white/5"
            asChild
          >
            <Link href="#how-it-works">Learn More</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto">
          <div>
            <div className="text-3xl font-bold text-white">300-850</div>
            <div className="text-sm text-neutral-500">Credit Score Range</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">3-10</div>
            <div className="text-sm text-neutral-500">Members per Circle</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">10-500</div>
            <div className="text-sm text-neutral-500">STX Contributions</div>
          </div>
        </div>
      </div>
    </section>
  );
}
