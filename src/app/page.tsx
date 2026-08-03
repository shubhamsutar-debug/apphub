import { MainLayout } from "@/components/layout/main-layout";
import { Hero } from "@/components/marketing/hero";
import {
  StatsSection,
  FeaturedSection,
  TrendingAppsSection,
  CategoriesSection,
  PublishingPlansSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
} from "@/components/marketing/sections";
import { createClient } from "@/lib/supabase/server";
import type { Application, Category } from "@/types";

// Cache homepage for 5 minutes — massively speeds up repeat visits
export const revalidate = 300;

async function getHomeData() {
  try {
    const supabase = await createClient();
    const [
      { data: featuredApps }, { data: trendingApps }, { data: categories },
      { count: totalApps }, { count: totalDownloads },
      { count: totalDevelopers }, { count: totalUsers },
    ] = await Promise.all([
      supabase.from("applications").select("id,name,slug,short_description,icon_url,rating_avg,download_count,is_featured,is_editors_choice,categories:category_id(name),developers:developer_id(display_name,slug)").eq("status","approved").eq("is_featured",true).order("published_at",{ascending:false}).limit(8),
      supabase.from("applications").select("id,name,slug,short_description,icon_url,rating_avg,download_count,categories:category_id(name),developers:developer_id(display_name,slug)").eq("status","approved").order("download_count",{ascending:false}).limit(6),
      supabase.from("categories").select("id,name,slug,icon,description,sort_order").eq("is_active",true).order("sort_order").limit(12),
      supabase.from("applications").select("*",{count:"exact",head:true}).eq("status","approved"),
      supabase.from("downloads").select("*",{count:"exact",head:true}),
      supabase.from("developers").select("*",{count:"exact",head:true}),
      supabase.from("users").select("*",{count:"exact",head:true}),
    ]);

    return {
      featuredApps: (featuredApps ?? []) as unknown as Application[],
      trendingApps: (trendingApps ?? []) as unknown as Application[],
      categories: (categories ?? []) as unknown as Category[],
      stats: {
        totalApps: totalApps ?? 0,
        totalDownloads: totalDownloads ?? 0,
        totalDevelopers: totalDevelopers ?? 0,
        totalUsers: totalUsers ?? 0,
      },
    };
  } catch {
    return { featuredApps: [], trendingApps: [], categories: [], stats: { totalApps: 0, totalDownloads: 0, totalDevelopers: 0, totalUsers: 0 } };
  }
}

export default async function HomePage() {
  const { featuredApps, trendingApps, categories, stats } = await getHomeData();

  return (
    <MainLayout>
      <Hero stats={stats} />
      <StatsSection stats={stats} />
      {featuredApps.length > 0 && <FeaturedSection apps={featuredApps} />}
      {trendingApps.length > 0 && <TrendingAppsSection apps={trendingApps} />}
      <CategoriesSection categories={categories.length > 0 ? categories : undefined} />
      <PublishingPlansSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
    </MainLayout>
  );
}
