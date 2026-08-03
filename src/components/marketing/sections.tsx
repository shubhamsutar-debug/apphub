"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Star, Download,
  Shield, Quote, ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Application, Category } from "@/types";

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// ── Static data ───────────────────────────────────────────────────────────────
const PLACEHOLDER_CATEGORIES: Partial<Category>[] = [
  { id: "1",  name: "Games",        slug: "games",        icon: "🎮", description: "Casual & hardcore gaming" },
  { id: "2",  name: "Productivity", slug: "productivity", icon: "📋", description: "Work smarter" },
  { id: "3",  name: "Social",       slug: "social",       icon: "💬", description: "Connect & share" },
  { id: "4",  name: "Music",        slug: "music",        icon: "🎵", description: "Listen & discover" },
  { id: "5",  name: "Photography",  slug: "photography",  icon: "📷", description: "Capture moments" },
  { id: "6",  name: "Tools",        slug: "tools",        icon: "🔧", description: "Handy utilities" },
  { id: "7",  name: "Education",    slug: "education",    icon: "📚", description: "Learn anything" },
  { id: "8",  name: "Finance",      slug: "finance",      icon: "💰", description: "Manage your money" },
  { id: "9",  name: "Health",       slug: "health",       icon: "❤️", description: "Wellness & fitness" },
  { id: "10", name: "Shopping",     slug: "shopping",     icon: "🛍️", description: "Shop & save" },
  { id: "11", name: "Travel",       slug: "travel",       icon: "✈️", description: "Explore the world" },
  { id: "12", name: "News",         slug: "news",         icon: "📰", description: "Stay informed" },
];

const TESTIMONIALS = [
  { name: "Priya Sharma",  role: "Android Developer", avatar: "PS", rating: 5,
    text: "AppHub made it incredibly easy to publish my app. The review process was fast and the support team was helpful. Got approved in under 48 hours!" },
  { name: "Rahul Verma",   role: "Startup Founder",   avatar: "RV", rating: 5,
    text: "We launched our startup app on AppHub first. The publishing fee is so affordable compared to other platforms. Our app hit 10K downloads in the first month." },
  { name: "Anjali Patel",  role: "App User",          avatar: "AP", rating: 5,
    text: "I love the curated selection of apps on AppHub. Every app I've installed works great and the reviews are genuine. Best Indian app marketplace!" },
  { name: "Suresh Kumar",  role: "Indie Developer",   avatar: "SK", rating: 4,
    text: "The developer dashboard is clean and gives me all the analytics I need. AppHub is the best place for indie developers to get discovered." },
];

const FAQS = [
  { q: "How do I publish my app on AppHub?",
    a: "Sign up, choose a publishing plan (starting at ₹5 for the Starter plan), become a developer, fill the submission form, upload your APK + screenshots, and submit for review. We typically review within 24–48 hours." },
  { q: "What are the publishing plans and prices?",
    a: "We have three plans: Starter (₹5/app), Standard (₹99/app), and Featured (₹199/app). Starter is the most affordable way to list your first app!" },
  { q: "Is AppHub safe to download apps from?",
    a: "Yes! Every app is manually reviewed before listing. We check for malware, privacy violations, and policy compliance." },
  { q: "What file formats are supported for APK uploads?",
    a: "We support standard .apk files up to 150 MB. Upload directly from your developer dashboard." },
  { q: "How long does the review process take?",
    a: "Basic: 24–72 hours. Priority: 12–24 hours. Featured: 6–12 hours." },
  { q: "Can I update my app after publishing?",
    a: "Absolutely! Submit new versions anytime from your developer dashboard." },
];

// ── Shared section header ─────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-10 text-center">
      <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-secondary-400">{subtitle}</p>}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatCard({ label, value, suffix, inView }: { label: string; value: number; suffix: string; inView: boolean }) {
  const count = useCountUp(value, 2000, inView);
  return (
    <div className="glass-card text-center">
      <p className="font-heading text-3xl font-bold text-primary sm:text-4xl">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="mt-2 text-sm text-secondary-400">{label}</p>
    </div>
  );
}

export function StatsSection() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section className="section-container py-20" ref={ref}>
      <SectionHeader title="Trusted by Thousands" subtitle="Join India's fastest-growing Android app marketplace" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Apps"     value={2500}    suffix="+" inView={inView} />
        <StatCard label="Downloads"      value={1200000} suffix="+" inView={inView} />
        <StatCard label="Developers"     value={850}     suffix="+" inView={inView} />
        <StatCard label="Active Users"   value={50000}   suffix="+" inView={inView} />
      </div>
    </section>
  );
}

// ── Featured carousel ─────────────────────────────────────────────────────────
function FeaturedAppCard({ app, index }: { app: Application; index: number }) {
  const dev = app.developers as { display_name: string } | null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.08 }}
      className="min-w-[260px] sm:min-w-[280px]"
    >
      <Link href={`/apps/${app.slug}`} className="block h-full">
        <div className="glass-card-hover group h-full cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              {app.icon_url
                ? <Image src={app.icon_url} alt={app.name} fill className="object-cover" sizes="64px" />
                : <div className="flex h-full w-full items-center justify-center text-2xl">📱</div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h3 className="truncate font-semibold text-white transition-colors group-hover:text-primary">{app.name}</h3>
                {app.is_editors_choice && <Shield className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </div>
              <p className="truncate text-sm text-secondary-400">{dev?.display_name}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-secondary-400">
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-3 w-3 fill-yellow-400" />
                  {app.rating_avg > 0 ? app.rating_avg.toFixed(1) : "New"}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {((app.download_count ?? 0) / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-xs text-secondary-400">{app.short_description}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-secondary-500">Free</span>
            <span className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors group-hover:bg-primary/20">
              Install
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function FeaturedSection({ apps }: { apps: Application[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (!apps || apps.length === 0) return null;
  const scroll = (d: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: d === "left" ? -300 : 300, behavior: "smooth" });
  return (
    <section className="section-container py-20">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-3xl font-bold">Featured Apps</h2>
          <p className="mt-2 text-secondary-400">Hand-picked by our editorial team</p>
        </div>
        <div className="flex gap-2">
          {(["left", "right"] as const).map((d) => (
            <button key={d} type="button" onClick={() => scroll(d)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-secondary-300 transition-colors hover:border-primary/40 hover:text-primary">
              {d === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {apps.map((app, i) => <FeaturedAppCard key={app.id} app={app} index={i} />)}
      </div>
    </section>
  );
}

// ── Trending ──────────────────────────────────────────────────────────────────
export function TrendingAppsSection({ apps }: { apps: Application[] }) {
  if (!apps || apps.length === 0) return null;
  return (
    <section className="section-container py-20">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-3xl font-bold">Trending Now</h2>
          <p className="mt-2 text-secondary-400">Most downloaded this week</p>
        </div>
        <Link href="/marketplace?sort=downloads">
          <Button variant="secondary" size="sm">See All</Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app, i) => {
          const dev = app.developers as { display_name: string } | null;
          return (
            <motion.div key={app.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Link href={`/apps/${app.slug}`}>
                <div className="flex items-center gap-4 rounded-2xl border border-primary/8 bg-night-900/60 p-4 transition-all hover:border-primary/25 hover:bg-night-800/70">
                  <span className="w-8 shrink-0 text-center font-heading text-2xl font-bold tabular-nums text-secondary-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/15">
                    {app.icon_url
                      ? <Image src={app.icon_url} alt={app.name} fill className="object-cover" sizes="48px" />
                      : <div className="flex h-full w-full items-center justify-center text-xl">📱</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{app.name}</p>
                    <p className="truncate text-xs text-secondary-400">{dev?.display_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-yellow-400">★ {app.rating_avg > 0 ? app.rating_avg.toFixed(1) : "New"}</p>
                    <p className="text-xs text-secondary-500">{((app.download_count ?? 0) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────
export function CategoriesSection({ categories }: { categories?: Category[] }) {
  const displayCats = categories ?? PLACEHOLDER_CATEGORIES;
  return (
    <section className="section-container py-20">
      <SectionHeader title="Browse by Category" subtitle="Find apps for every need" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {displayCats.map((cat, i) => (
          <motion.div key={cat.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
            <Link href={`/marketplace?category=${cat.slug}`}>
              <Card hover className="group cursor-pointer text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl transition-transform group-hover:scale-110">
                  {cat.icon ?? "📱"}
                </div>
                <p className="font-heading font-semibold text-white">{cat.name}</p>
                {cat.description && <p className="mt-1 text-xs text-secondary-500 line-clamp-1">{cat.description}</p>}
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Publishing Plans ──────────────────────────────────────────────────────────
export function PublishingPlansSection() {
  const plans = [
    {
      name: "Starter",
      price: "₹5",
      period: "per app",
      highlight: false,
      badge: "🎁 Try Now",
      cta: "Start for ₹5",
      features: [
        "Standard listing",
        "24–72h review time",
        "App analytics",
        "Community support",
        "Unlimited updates",
      ],
    },
    {
      name: "Standard",
      price: "₹99",
      period: "per app",
      highlight: true,
      badge: "Popular",
      cta: "Publish for ₹99",
      features: [
        "Standard listing",
        "24–72h review time",
        "App analytics",
        "Community support",
        "Unlimited updates",
      ],
    },
    {
      name: "Featured",
      price: "₹199",
      period: "per app",
      highlight: false,
      badge: "⭐ Recommended",
      cta: "Featured for ₹199",
      features: [
        "Homepage featured placement",
        "6–12h review priority",
        "Premium analytics",
        "Dedicated support",
        "Badge on listing",
      ],
    },
  ];

  return (
    <section className="section-container py-20">
      <SectionHeader title="Simple, Affordable Pricing" subtitle="Publish your app and reach thousands of users" />
      <div className="grid gap-6 sm:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`relative rounded-2xl p-6 transition-all ${
              plan.highlight
                ? "border-2 border-primary bg-primary/5 shadow-glow"
                : "border border-white/10 bg-night-900/40 hover:border-primary/30"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`rounded-full px-4 py-1 text-xs font-bold whitespace-nowrap ${
                  plan.highlight
                    ? "bg-primary text-night-900"
                    : "bg-secondary-800 text-secondary-200 border border-white/10"
                }`}>
                  {plan.badge}
                </span>
              </div>
            )}
            <h3 className="mt-1 font-heading text-lg font-bold">{plan.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold text-primary">{plan.price}</span>
              <span className="text-sm text-secondary-400">{plan.period}</span>
            </div>
            <ul className="my-5 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-secondary-300">
                  <span className="mt-0.5 text-primary font-bold shrink-0">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/publish">
              <Button className="w-full" variant={plan.highlight ? "primary" : "secondary"}>
                {plan.cta}
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
export function TestimonialsSection() {
  return (
    <section className="section-container py-20">
      <SectionHeader title="Loved by Developers & Users" subtitle="What people say about AppHub" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <Card className="flex h-full flex-col">
              <Quote className="h-6 w-6 text-primary/50" />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-secondary-300">{t.text}</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-heading text-sm font-bold text-primary">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-secondary-500">{t.role}</p>
                </div>
                <div className="ml-auto flex">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-primary/8 last:border-0">
      <button type="button" className="flex w-full items-center justify-between py-5 text-left"
        onClick={() => setOpen(!open)}>
        <span className="pr-4 font-heading font-medium">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-primary/60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} className="overflow-hidden">
        <p className="pb-5 text-sm leading-relaxed text-secondary-400">{a}</p>
      </motion.div>
    </div>
  );
}

export function FAQSection() {
  return (
    <section className="section-container py-20">
      <SectionHeader title="Frequently Asked Questions" subtitle="Got a question? We've got answers." />
      <div className="mx-auto max-w-3xl glass-card">
        {FAQS.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
export function CTASection() {
  return (
    <section className="section-container py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-night-900/80 to-night-950 p-12 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(137,233,0,0.18),transparent_60%)]" />
        <div className="relative">
          <span className="badge-kiwi">🚀 Start Today</span>
          <h2 className="mt-6 font-heading text-3xl font-bold sm:text-4xl">
            Ready to reach thousands of users?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-secondary-400">
            Join hundreds of developers already publishing on AppHub. Start from just ₹5!
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/submit-app"><Button size="lg">Publish Your App</Button></Link>
            <Link href="/marketplace"><Button variant="secondary" size="lg">Browse Apps</Button></Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export function ComingSoonSection() { return null; }
