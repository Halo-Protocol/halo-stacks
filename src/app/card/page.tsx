"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  TrendingUp,
  User,
  CreditCard,
  ArrowRight,
  Check,
  Loader2,
  Twitter,
  Github,
} from "lucide-react";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

// ---------- Animated Headline ----------

const animatedWords = ["Decentralized", "Trustless", "Community", "Empowered"];

function AnimatedHeadline() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animatedWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[1.2em] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={animatedWords[currentIndex]}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute left-0 text-[#00ff9d] text-glow-green"
        >
          {animatedWords[currentIndex]}
          <span className="animate-typing ml-1">|</span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ---------- 3D Card ----------

function HaloCard3D() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative perspective-1000"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        rotateY: isHovered ? 15 : 0,
        rotateX: isHovered ? -5 : 0,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="relative w-[320px] h-[200px] md:w-[400px] md:h-[250px] rounded-2xl overflow-hidden"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-white/10 rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#00ff9d]/20 via-transparent to-orange-500/10 rounded-2xl" />
        <div className="absolute top-6 left-6 md:top-8 md:left-8">
          <div className="mb-4 md:mb-6">
            <Image
              src="/halo-logo.png"
              alt="HALO"
              width={120}
              height={40}
              className="h-8 md:h-10 w-auto brightness-0 invert"
            />
          </div>
          <div className="font-mono text-xs md:text-sm text-white/60 tracking-widest">
            **** **** **** 2847
          </div>
        </div>
        <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 flex justify-between items-end">
          <div>
            <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider mb-1">
              Cardholder
            </p>
            <p className="text-xs md:text-sm font-medium text-white">
              SATOSHI NAKAMOTO
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider mb-1">
              Valid
            </p>
            <p className="text-xs md:text-sm font-medium text-white">12/28</p>
          </div>
        </div>
        <div
          className="absolute inset-0 rounded-2xl transition-all duration-300"
          style={{
            boxShadow: isHovered
              ? "0 0 60px hsl(158 100% 50% / 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              : "0 0 30px hsl(158 100% 50% / 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// ---------- Ticker Marquee ----------

function TickerMarquee() {
  const items = [
    "NO HIDDEN FEES",
    "NON-CUSTODIAL",
    "BITCOIN SECURED",
    "STACKS POWERED",
    "EARN YIELD",
    "OWN YOUR KEYS",
    "24/7 ACCESS",
    "GLOBAL REACH",
  ];

  const tickerContent = items.map((item, idx) => (
    <span
      key={idx}
      className="inline-flex items-center mx-8 text-sm md:text-base font-semibold tracking-widest text-[#00ff9d] text-glow-green"
    >
      {item}
      <span className="ml-8 text-white/20">&bull;</span>
    </span>
  ));

  return (
    <div className="relative w-full overflow-hidden bg-zinc-900/50 border-y border-white/5 py-4">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            duration: 30,
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop",
          },
        }}
      >
        {tickerContent}
        {tickerContent}
      </motion.div>
    </div>
  );
}

// ---------- Bento Cards ----------

function BentoCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card glass-card-hover rounded-2xl p-6 md:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function VaultCard() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <BentoCard className="col-span-1 md:col-span-2 row-span-1">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <motion.div
          className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#00ff9d]/20 to-[#00ff9d]/5 flex items-center justify-center cursor-pointer"
          onMouseEnter={() => setIsUnlocked(true)}
          onMouseLeave={() => setIsUnlocked(false)}
          whileHover={{ scale: 1.05 }}
        >
          <AnimatePresence mode="wait">
            {isUnlocked ? (
              <motion.div
                key="unlocked"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Unlock className="w-8 h-8 md:w-10 md:h-10 text-[#00ff9d]" />
              </motion.div>
            ) : (
              <motion.div
                key="locked"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Lock className="w-8 h-8 md:w-10 md:h-10 text-[#00ff9d]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <div className="flex-1">
          <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
            The Vault
          </h3>
          <p className="text-zinc-400 text-sm md:text-base">
            Bitcoin L1 Security + Stacks L2 Speed. Your assets protected by the
            most secure network, with instant transactions when you need them.
          </p>
        </div>
      </div>
    </BentoCard>
  );
}

function YieldCard() {
  const [count, setCount] = useState(5.42);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const next = prev + Math.random() * 0.01;
        return Math.round(next * 100) / 100;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BentoCard className="col-span-1 row-span-1 lg:row-span-2" delay={0.1}>
      <div className="h-full flex flex-col">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center mb-6">
          <TrendingUp className="w-7 h-7 text-orange-400" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
          Yield
        </h3>
        <p className="text-zinc-400 text-sm mb-6">Earn while you sleep.</p>
        <div className="mt-auto">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Current APY
          </p>
          <motion.div
            key={count}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-bold text-orange-400 font-mono"
          >
            {count.toFixed(2)}%
          </motion.div>
        </div>
      </div>
    </BentoCard>
  );
}

function IdentityCard() {
  return (
    <BentoCard className="col-span-1 row-span-1" delay={0.2}>
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-4">
        <User className="w-6 h-6 text-cyan-400" />
      </div>
      <h3 className="text-lg md:text-xl font-bold text-white mb-2">
        Identity
      </h3>
      <p className="text-zinc-400 text-sm mb-4">Claim your name.</p>
      <div className="bg-zinc-900/80 rounded-lg p-3 border border-white/5">
        <p className="text-xs text-zinc-500 mb-1">Instead of</p>
        <p className="font-mono text-xs text-white/40 truncate mb-2">
          0x3f9a2...8b7c
        </p>
        <p className="text-xs text-zinc-500 mb-1">You get</p>
        <p className="font-mono text-sm text-[#00ff9d] font-semibold">
          kunal.btc
        </p>
      </div>
    </BentoCard>
  );
}

function CreditCardFeature() {
  return (
    <BentoCard className="col-span-1 row-span-1" delay={0.3}>
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center mb-4">
        <CreditCard className="w-6 h-6 text-purple-400" />
      </div>
      <h3 className="text-lg md:text-xl font-bold text-white mb-2">
        Credit Card
      </h3>
      <p className="text-zinc-400 text-sm mb-4">Spend anywhere.</p>
      <div className="relative h-20 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 blur-sm" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
            Coming Soon
          </span>
        </div>
      </div>
    </BentoCard>
  );
}

// ---------- Waitlist Forms ----------

function useWaitlistSubmit() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }
      setSubmitted(true);
      toast.success("You're in! We'll notify you when the protocol opens.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  return { loading, submitted, submit };
}

function useWaitlistCount() {
  const [count, setCount] = useState(1240);

  useEffect(() => {
    const load = () => {
      fetch("/api/waitlist/count")
        .then((r) => r.json())
        .then((d) => d.count && setCount(d.count))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return count;
}

function HeroWaitlistForm() {
  const [email, setEmail] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const { loading, submitted, submit } = useWaitlistSubmit();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email) submit(email);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 text-[#00ff9d]"
      >
        <div className="w-8 h-8 rounded-full bg-[#00ff9d]/20 flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>
        <span className="font-medium">You&apos;re in the Halo!</span>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3"
    >
      <Input
        type="email"
        required
        placeholder="Enter your email..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        className="h-12 w-full sm:w-72 bg-zinc-900/80 border-white/10 focus:border-[#00ff9d]/50 focus:ring-[#00ff9d]/20 text-white placeholder:text-zinc-500 transition-all duration-300"
      />
      <div className="relative group">
        <motion.div
          className="absolute -inset-1 bg-gradient-to-r from-[#00ff9d] to-cyan-400 rounded-lg blur transition-all duration-500"
          animate={{
            opacity: inputFocused || email.length > 0 ? 0.75 : 0.25,
          }}
        />
        <Button
          type="submit"
          disabled={loading}
          className="relative h-12 px-6 bg-[#00ff9d] text-black font-semibold rounded-lg flex items-center gap-2 w-full sm:w-auto hover:bg-[#00e68a]"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Get Early Access
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function WaitlistSection() {
  const [email, setEmail] = useState("");
  const { loading, submitted, submit } = useWaitlistSubmit();
  const displayCount = useWaitlistCount();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email) submit(email);
  };

  return (
    <section className="py-20 md:py-32 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Join the Beta
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Reserve your spot early and be first in line.
          </p>

          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff9d]/10 border border-[#00ff9d]/20 mb-8"
            animate={{
              boxShadow: [
                "0 0 20px hsl(158 100% 50% / 0.2)",
                "0 0 40px hsl(158 100% 50% / 0.4)",
                "0 0 20px hsl(158 100% 50% / 0.2)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse" />
            <span className="text-sm text-[#00ff9d] font-medium">
              <motion.span
                key={displayCount}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {displayCount.toLocaleString()}
              </motion.span>{" "}
              people have joined
            </span>
          </motion.div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-[#00ff9d]/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-[#00ff9d]" />
                </div>
                <p className="text-lg text-white font-medium">
                  You&apos;re in the Halo.
                </p>
                <p className="text-zinc-400">
                  We&apos;ll notify you when the protocol opens.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                >
                  <Input
                    type="email"
                    required
                    placeholder="Enter your email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 h-12 bg-zinc-900/80 border-white/10 focus:border-[#00ff9d]/50 focus:ring-[#00ff9d]/20 text-white placeholder:text-zinc-500"
                  />
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#00ff9d] to-cyan-400 rounded-lg blur opacity-25 group-hover:opacity-75 transition-all duration-500" />
                    <Button
                      type="submit"
                      disabled={loading}
                      className="relative h-12 px-6 bg-[#00ff9d] text-black font-semibold rounded-lg flex items-center gap-1 hover:bg-[#00e68a]"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Get Early Access
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

// ---------- Footer ----------

function Footer() {
  return (
    <footer className="border-t border-white/5 py-8 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/halo-logo.png"
            alt="HALO"
            width={80}
            height={28}
            className="h-6 w-auto brightness-0 invert"
          />
          <span className="text-sm text-zinc-400">
            Decentralized lending circles on Bitcoin.
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-[#00ff9d] transition-colors"
            aria-label="Twitter"
          >
            <Twitter className="w-5 h-5" />
          </a>
          <a
            href="https://discord.gg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-[#00ff9d] transition-colors"
            aria-label="Discord"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-[#00ff9d] transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <a href="#" className="hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}

// ---------- Main Page ----------

export default function CardPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00ff9d]/10 via-[#0a0a0a] to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHpNMjAgMzBoNHY0aC00ek00MCAyNmg0djRoLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-0 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ff9d]/10 border border-[#00ff9d]/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" />
                <span className="text-xs text-[#00ff9d] font-medium uppercase tracking-wider">
                  Now in Beta
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-2">
                Your Bitcoin.
              </h1>
              <div className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6">
                <AnimatedHeadline />
              </div>

              <p className="text-lg md:text-xl text-zinc-400 max-w-lg mb-8">
                The first decentralized lending circle protocol on Bitcoin.
                Build credit, save together, and manage your wealth on-chain.
              </p>

              <HeroWaitlistForm />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 lg:order-2 flex justify-center lg:justify-end"
            >
              <HaloCard3D />
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-2 rounded-full bg-white/40"
            />
          </motion.div>
        </div>
      </section>

      <TickerMarquee />

      {/* Why HALO */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Stop juggling wallets.
            </h2>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
              Banking is broken. We fixed it with Bitcoin. Manage assets, earn
              yield, and own your identity. No banks. Just code.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-10 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <VaultCard />
            <YieldCard />
            <IdentityCard />
            <CreditCardFeature />
          </div>
        </div>
      </section>

      <WaitlistSection />

      <Footer />
    </div>
  );
}
