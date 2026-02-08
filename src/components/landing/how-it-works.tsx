import Link from "next/link";
import { Button } from "../ui/button";

const steps = [
  {
    step: "01",
    title: "Sign Up & Verify",
    description:
      "Create your account with Google or GitHub and verify your identity to join the Halo Protocol community.",
  },
  {
    step: "02",
    title: "Connect Wallet",
    description:
      "Link your Leather or Xverse wallet. This binding is permanent and ensures one account per person.",
  },
  {
    step: "03",
    title: "Join or Create a Circle",
    description:
      "Find an existing circle to join or create your own with custom contribution amounts and schedules.",
  },
  {
    step: "04",
    title: "Contribute & Build Credit",
    description:
      "Make your contributions on time. Each payment builds your credit score and brings you closer to your payout.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 border-t border-white/10"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-neutral-400">
            Get started in minutes with these simple steps
          </p>
        </div>

        <div className="space-y-12">
          {steps.map((item) => (
            <div key={item.step} className="flex gap-6">
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white font-mono text-sm">
                  {item.step}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-neutral-400">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Button size="lg" asChild>
            <Link href="/signin">Start Building Credit</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
