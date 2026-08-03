"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Download,
  Star,
  Users,
  Package,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

const FLOATING_ICONS = [
  { emoji: "🎮", x: "8%",  y: "22%", delay: 0 },
  { emoji: "📱", x: "84%", y: "14%", delay: 0.5 },
  { emoji: "🎵", x: "76%", y: "68%", delay: 1 },
  { emoji: "📷", x: "12%", y: "72%", delay: 1.5 },
  { emoji: "💬", x: "50%", y: "8%",  delay: 2 },
  { emoji: "🛒", x: "91%", y: "44%", delay: 0.8 },
];

interface HomeStats {
  totalApps: number;
  totalDownloads: number;
  totalDevelopers: number;
  totalUsers: number;
}

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K+`;
  return n > 0 ? `${n}+` : "0";
}

export function Hero({ stats }: { stats?: HomeStats }) {
  const STATS = [
    { label: "Published Apps", value: formatStat(stats?.totalApps ?? 0),       icon: Package    },
    { label: "Downloads",      value: formatStat(stats?.totalDownloads ?? 0),  icon: Download   },
    { label: "Developers",     value: formatStat(stats?.totalDevelopers ?? 0), icon: Users      },
    { label: "Registered Users", value: formatStat(stats?.totalUsers ?? 0),    icon: TrendingUp },
  ];
  return (
    <section className="relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-hero-glow opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(137,233,0,0.06),transparent_50%)]" />
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#89E900 1px, transparent 1px), linear-gradient(90deg, #89E900 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating app icons */}
      {FLOATING_ICONS.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute hidden text-3xl sm:block"
          style={{ left: icon.x, top: icon.y }}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: icon.delay, ease: "easeInOut" }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
            style={{
              background: "rgba(26,26,26,0.80)",
              border: "1px solid rgba(137,233,0,0.18)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
              backdropFilter: "blur(12px)",
            }}
          >
            {icon.emoji}
          </div>
        </motion.div>
      ))}

      <div className="section-container relative py-24 sm:py-32 lg:py-44">
        <div className="mx-auto max-w-4xl text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="badge-kiwi">
              <Star className="h-3.5 w-3.5 fill-primary" />
              India&apos;s Trusted Android Marketplace
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-8 font-heading text-5xl font-bold tracking-tight leading-[1.08] sm:text-6xl lg:text-7xl"
          >
            Discover, Publish &{" "}
            <span className="text-gradient">Grow Amazing Apps</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-secondary-400 sm:text-xl leading-relaxed"
          >
            Install trusted Android apps and publish your own affordably.
            Join thousands of developers and users on AppHub.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href={ROUTES.marketplace}>
              <Button size="lg" className="group min-w-[180px]">
                Browse Apps
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/submit-app">
              <Button variant="secondary" size="lg" className="min-w-[180px]">
                Publish App
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-2xl p-5 text-center transition-all"
              style={{
                background: "rgba(26,26,26,0.65)",
                border: "1px solid rgba(137,233,0,0.10)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.30)",
                backdropFilter: "blur(16px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(137,233,0,0.35)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(137,233,0,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(137,233,0,0.10)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.30)";
              }}
            >
              <stat.icon className="mx-auto h-5 w-5 text-primary opacity-80" />
              <p className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-secondary-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
