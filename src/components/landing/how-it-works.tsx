import { Card, CardContent } from "../ui/card";
import { Users, CreditCard, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Users,
    title: "Join a Circle",
    description:
      "Create or join a lending circle with 3-10 members. Each member contributes a fixed amount of STX every round.",
  },
  {
    icon: CreditCard,
    title: "Make Payments",
    description:
      "Contribute STX each round. One member receives the full pot as a payout. The rotation continues until everyone has received.",
  },
  {
    icon: TrendingUp,
    title: "Build Credit",
    description:
      "Every on-time payment increases your on-chain credit score. Completing circles and staking sBTC boost it further.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-muted/50">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <Card key={i} className="relative">
              <CardContent className="pt-8 pb-6 px-6 text-center">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <step.icon className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
