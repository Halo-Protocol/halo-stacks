import { Hero } from "../components/landing/hero";
import { HowItWorks } from "../components/landing/how-it-works";
import { CTASection } from "../components/landing/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <CTASection />
    </>
  );
}
