import { Hero } from "../components/landing/hero";
import { Features } from "../components/landing/features";
import { HowItWorks } from "../components/landing/how-it-works";
import { CTASection } from "../components/landing/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <CTASection />
    </>
  );
}
