import { z } from "zod";

export const appSubmissionSchema = z.object({
  name: z.string().min(2, "App name must be at least 2 characters").max(100),
  short_description: z.string().min(10, "Short description must be at least 10 characters").max(200),
  full_description: z.string().min(50, "Full description must be at least 50 characters").max(5000),
  category_id: z.string().uuid("Select a valid category"),
  version: z.string().min(1, "Version is required").max(20),
  developer_website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  privacy_policy_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  support_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  tags: z.string().optional(),
  package_name: z.string().optional(),
  // "starter" = ₹5 plan — maps to "basic" in DB since Postgres ENUM only has basic/priority/featured
  publishing_plan: z.enum(["starter", "basic", "priority", "featured"]),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional().or(z.literal("")),
  body: z.string().max(2000).optional().or(z.literal("")),
});

export const developerProfileSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(100),
  bio: z.string().max(500).optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  support_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

export type AppSubmissionInput = z.infer<typeof appSubmissionSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type DeveloperProfileInput = z.infer<typeof developerProfileSchema>;
