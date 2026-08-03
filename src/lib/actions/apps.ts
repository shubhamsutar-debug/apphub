"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appSubmissionSchema, reviewSchema } from "@/lib/validations/app";
import { getCurrentUser } from "@/lib/auth/session";
import type { AppStatus } from "@/types";

export type AppActionState = {
  error?: string;
  success?: string;
  appId?: string;
};

// ─── Developer Actions ───────────────────────────────────────────────────────

export async function submitAppAction(
  _prevState: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user || (user.profile.role !== "developer" && user.profile.role !== "admin")) {
    return { error: "You must be a developer to submit apps" };
  }

  const parsed = appSubmissionSchema.safeParse({
    name: formData.get("name"),
    short_description: formData.get("short_description"),
    full_description: formData.get("full_description"),
    category_id: formData.get("category_id"),
    version: formData.get("version"),
    developer_website: formData.get("developer_website") || undefined,
    privacy_policy_url: formData.get("privacy_policy_url") || undefined,
    support_email: formData.get("support_email") || undefined,
    tags: formData.get("tags") || undefined,
    publishing_plan: formData.get("publishing_plan"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  // Get developer profile
  const { data: developer, error: devError } = await supabase
    .from("developers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (devError || !developer) {
    return { error: "Developer profile not found. Please set up your developer profile first." };
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    + "-" + Date.now().toString(36);

  const tagsArray = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Collect uploaded file URLs from form
  const iconUrl = formData.get("icon_url")?.toString() || null;
  const bannerUrl = formData.get("banner_url")?.toString() || null;
  const apkUrl = formData.get("apk_url")?.toString() || null;
  const apkSizeBytes = parseInt(formData.get("apk_size_bytes")?.toString() ?? "0") || 0;
  const screenshotsRaw = formData.get("screenshots")?.toString() || "[]";
  let screenshotUrls: string[] = [];
  try { screenshotUrls = JSON.parse(screenshotsRaw); } catch { screenshotUrls = []; }

  const isAdmin = user.profile.role === "admin";

  const insertPayload: Record<string, unknown> = {
    developer_id: developer.id,
    name: parsed.data.name,
    slug,
    short_description: parsed.data.short_description,
    full_description: parsed.data.full_description,
    category_id: parsed.data.category_id,
    current_version: parsed.data.version,
    developer_website: parsed.data.developer_website || null,
    privacy_policy_url: parsed.data.privacy_policy_url || null,
    support_email: parsed.data.support_email || null,
    tags: tagsArray,
    // Map "starter" to "basic" for DB ENUM (applications table uses publishing_plan ENUM)
    publishing_plan: (parsed.data.publishing_plan === "starter" ? "basic" : parsed.data.publishing_plan) as "basic" | "priority" | "featured",
    package_name: formData.get("package_name")?.toString() || null,
    icon_url: iconUrl,
    banner_url: bannerUrl,
    apk_size_bytes: apkSizeBytes || null,
    // Admin publishes instantly; regular devs go to pending_review
    status: isAdmin ? "approved" : "pending_review",
    published_at: isAdmin ? new Date().toISOString() : null,
  };

  const adminClient = createAdminClient();

  let { data: app, error } = await adminClient
    .from("applications")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error && error.message?.includes("package_name")) {
    delete insertPayload.package_name;
    const retry = await adminClient
      .from("applications")
      .insert(insertPayload)
      .select("id")
      .single();
    app = retry.data;
    error = retry.error;
  }

  if (error || !app) {
    return { error: error?.message ?? "Failed to create application" };
  }

  // Save APK version record
  if (apkUrl) {
    await adminClient.from("application_versions").insert({
      application_id: app.id,
      version: parsed.data.version,
      apk_path: apkUrl,
      apk_size_bytes: apkSizeBytes || 0,
      is_active: true,
    });
  }

  // Save screenshots
  if (screenshotUrls.length > 0) {
    await adminClient.from("application_screenshots").insert(
      screenshotUrls.map((url, i) => ({
        application_id: app.id,
        url,
        sort_order: i,
      }))
    );
  }

  // Create payment record (skip for admin)
  if (!isAdmin) {
    const rawAmountPaise = parseInt(formData.get("payment_amount_paise")?.toString() ?? "0") || 9900;
    const paymentScreenshotUrl = formData.get("payment_screenshot_url")?.toString() || null;
    const chosenPlan = parsed.data.publishing_plan || "basic";

    const defaultPlanPrices: Record<string, number> = {
      starter: 500,   // ₹5
      basic: 9900,
      priority: 19900,
      featured: 19900,
    };
    const amountPaise = rawAmountPaise || defaultPlanPrices[chosenPlan] || 9900;

    // Map "starter" to "basic" for DB ENUM compatibility
    const dbPlan = chosenPlan === "starter" ? "basic" : chosenPlan;

    await adminClient.from("payments").insert({
      user_id: user.id,
      application_id: app.id,
      plan: dbPlan,
      amount_paise: amountPaise,
      status: "pending",
      metadata: paymentScreenshotUrl
        ? { screenshot_url: paymentScreenshotUrl, manual_payment: true, amount_rupees: amountPaise / 100, original_plan: chosenPlan }
        : { original_plan: chosenPlan },
    });

    // Notify admins about new submission
    const { data: admins } = await adminClient
      .from("users")
      .select("id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      await adminClient.from("notifications").insert(
        admins.map((admin) => ({
          user_id: admin.id,
          type: "new_submission" as const,
          title: "New App Submission",
          body: `${parsed.data.name} has been submitted for review.`,
          link: `/dashboard/admin/apps`,
          metadata: { app_id: app.id },
        }))
      );
    }
  }

  revalidatePath("/dashboard/developer/apps");
  // Return success instead of redirect — client handles navigation after showing success screen
  return { success: "App submitted successfully", appId: app.id };
}

export async function updateAppAction(
  _prevState: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const appId = formData.get("app_id")?.toString()?.trim();
  if (!appId) return { error: "App ID required" };

  const parsed = appSubmissionSchema.omit({ publishing_plan: true }).safeParse({
    name: formData.get("name"),
    short_description: formData.get("short_description"),
    full_description: formData.get("full_description"),
    category_id: formData.get("category_id"),
    version: formData.get("version"),
    developer_website: formData.get("developer_website") || undefined,
    privacy_policy_url: formData.get("privacy_policy_url") || undefined,
    support_email: formData.get("support_email") || undefined,
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const adminClient = createAdminClient();
  const tagsArray = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Collect updated file URLs if developer uploaded new ones
  const newIconUrl = formData.get("icon_url")?.toString() || null;
  const newBannerUrl = formData.get("banner_url")?.toString() || null;
  const newApkUrl = formData.get("apk_url")?.toString() || null;
  const newApkVersion = formData.get("apk_version")?.toString() || null;
  const screenshotsRaw = formData.get("screenshots")?.toString();
  let newScreenshots: string[] | null = null;
  if (screenshotsRaw) {
    try { newScreenshots = JSON.parse(screenshotsRaw); } catch { newScreenshots = null; }
  }

  const newPackageName = formData.get("package_name")?.toString()?.trim() || null;

  // 1. Fetch current app using adminClient (bypasses RLS blocks)
  let currentApp: { id: string; name: string; status: string; developer_id: string; package_name?: string | null } | null = null;

  const { data: fetchedApp, error: fetchErr } = await adminClient
    .from("applications")
    .select("id, name, status, developer_id, package_name")
    .eq("id", appId)
    .maybeSingle();

  if (fetchErr) {
    if (fetchErr.message?.includes("package_name")) {
      // Fallback query if package_name column does not exist in DB yet
      const { data: fallbackApp, error: fallbackErr } = await adminClient
        .from("applications")
        .select("id, name, status, developer_id")
        .eq("id", appId)
        .maybeSingle();

      if (fallbackErr) return { error: `Database error: ${fallbackErr.message}` };
      currentApp = fallbackApp;
    } else {
      return { error: `Database error: ${fetchErr.message}` };
    }
  } else {
    currentApp = fetchedApp;
  }

  if (!currentApp) {
    return { error: `App not found (ID: ${appId})` };
  }

  // 2. Authorization check: ensure user owns this application or is admin
  const isAdmin = user.profile?.role === "admin";
  if (!isAdmin) {
    const { data: dev } = await adminClient
      .from("developers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!dev || currentApp.developer_id !== dev.id) {
      return { error: "Unauthorized to edit this application." };
    }
  }

  // 3. Package Name Security Lockdown Check: Prevent replacing this app with a completely different APK
  if (currentApp.package_name && newPackageName && newPackageName.toLowerCase() !== currentApp.package_name.toLowerCase()) {
    return {
      error: `❌ Package name mismatch! The uploaded APK package name ("${newPackageName}") does not match this app's registered package name ("${currentApp.package_name}"). You cannot replace an existing app with a completely different application.`
    };
  }

  // If developer is submitting changes that were requested by admin,
  // move status back to pending_review so admin can review again
  const wasChangesRequested = currentApp.status === "changes_requested";

  const updatePayload: Record<string, unknown> = {
    name: parsed.data.name,
    short_description: parsed.data.short_description,
    full_description: parsed.data.full_description,
    category_id: parsed.data.category_id,
    current_version: parsed.data.version,
    developer_website: parsed.data.developer_website || null,
    tags: tagsArray,
    ...(newIconUrl ? { icon_url: newIconUrl } : {}),
    ...(newBannerUrl ? { banner_url: newBannerUrl } : {}),
    ...(wasChangesRequested ? { status: "pending_review", admin_notes: null } : {}),
  };

  if (newPackageName) {
    updatePayload.package_name = newPackageName;
  }

  let { error } = await adminClient
    .from("applications")
    .update(updatePayload)
    .eq("id", appId);

  if (error && error.message?.includes("package_name")) {
    // Retry update without package_name if column not in DB schema yet
    delete updatePayload.package_name;
    const retry = await adminClient
      .from("applications")
      .update(updatePayload)
      .eq("id", appId);
    error = retry.error;
  }

  if (error) return { error: error.message };

  // Save new APK version if uploaded
  if (newApkUrl) {
    const versionString = (parsed.data.version || newApkVersion || "1.0.0").trim();

    // Delete ALL old versions for this app (not just deactivate)
    // This avoids UNIQUE constraint conflicts on re-upload with same version number
    await adminClient
      .from("application_versions")
      .delete()
      .eq("application_id", appId);

    // Insert new active version
    const { error: versionError } = await adminClient
      .from("application_versions")
      .insert({
        application_id: appId,
        version: versionString,
        apk_path: newApkUrl,
        apk_size_bytes: 0,
        is_active: true,
      });

    // Log error but don't fail the whole update
    if (versionError) {
      console.error("APK version insert error:", versionError.message);
    }
  }

  // Replace screenshots if new ones were provided
  if (newScreenshots && newScreenshots.length > 0) {
    // Delete old screenshots
    await adminClient
      .from("application_screenshots")
      .delete()
      .eq("application_id", appId);

    // Insert new ones
    await adminClient.from("application_screenshots").insert(
      newScreenshots.map((url: string, i: number) => ({
        application_id: appId,
        url,
        sort_order: i,
      }))
    );
  }

  // Notify all admins that the developer has made the requested changes
  if (wasChangesRequested) {
    try {
      const { data: admins } = await adminClient
        .from("users")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        await adminClient.from("notifications").insert(
          admins.map((admin) => ({
            user_id: admin.id,
            type: "app_updated" as const,
            title: "✅ Developer Made Changes",
            body: `"${parsed.data.name}" has been updated and re-submitted for review.`,
            link: `/dashboard/admin/apps`,
            metadata: { app_id: appId },
          }))
        );
      }
    } catch {
      // Notification failure shouldn't block the save
    }
  }

  revalidatePath("/dashboard/developer/apps");
  revalidatePath(`/dashboard/developer/apps/${appId}/edit`);
  revalidatePath(`/dashboard/admin/apps`);
  revalidatePath(`/dashboard/admin/apps/${appId}`);
  revalidatePath("/marketplace");

  return {
    success: wasChangesRequested
      ? "Changes saved and re-submitted for review! Admin has been notified."
      : "App updated successfully",
  };
}

export async function deleteAppAction(appId: string): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  // Use adminClient to bypass RLS on delete
  const adminClient = createAdminClient();

  // Verify ownership before deleting
  const supabase = await createClient();
  const { data: dev } = await supabase.from("developers").select("id").eq("user_id", user.id).single();

  if (!dev && user.profile.role !== "admin") return { error: "Not authorized" };

  // Delete related records first
  await adminClient.from("application_versions").delete().eq("application_id", appId);
  await adminClient.from("application_screenshots").delete().eq("application_id", appId);
  await adminClient.from("reviews").delete().eq("application_id", appId);
  await adminClient.from("favorites").delete().eq("application_id", appId);
  await adminClient.from("downloads").delete().eq("application_id", appId);

  const { error } = await adminClient.from("applications").delete().eq("id", appId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/developer/apps");
  return { success: "App deleted" };
}

export async function createDeveloperProfileAction(
  _prevState: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const displayName = formData.get("display_name")?.toString()?.trim();
  const bio = formData.get("bio")?.toString()?.trim();
  const website = formData.get("website")?.toString()?.trim();
  const supportEmail = formData.get("support_email")?.toString()?.trim();

  if (!displayName || displayName.length < 2) {
    return { error: "Display name must be at least 2 characters" };
  }

  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    + "-" + Date.now().toString(36);

  const supabase = await createClient();

  // Check if already exists
  const { data: existing } = await supabase
    .from("developers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("developers")
      .update({
        display_name: displayName,
        bio: bio || null,
        website: website || null,
        support_email: supportEmail || null,
      })
      .eq("user_id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/developer");
    return { success: "Profile updated" };
  }

  const adminClient = createAdminClient();

  // Create developer profile
  const { error: devError } = await adminClient
    .from("developers")
    .insert({
      user_id: user.id,
      display_name: displayName,
      slug,
      bio: bio || null,
      website: website || null,
      support_email: supportEmail || null,
    });

  if (devError) return { error: devError.message };

  // Upgrade user role
  const { error: roleError } = await adminClient
    .from("users")
    .update({ role: "developer" })
    .eq("id", user.id);

  if (roleError) return { error: roleError.message };

  revalidatePath("/dashboard/developer");
  redirect("/dashboard/developer");
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export async function approveAppAction(appId: string): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { error: "Unauthorized" };

  const adminClient = createAdminClient();

  const { data: app, error: fetchError } = await adminClient
    .from("applications")
    .update({
      status: "approved",
      published_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", appId)
    .select("name, developer_id")
    .single();

  if (fetchError || !app) return { error: fetchError?.message ?? "App not found" };

  // Update payment status to paid (verified)
  await adminClient
    .from("payments")
    .update({ status: "paid" })
    .eq("application_id", appId);

  // Get developer user_id
  const { data: dev } = await adminClient
    .from("developers")
    .select("user_id")
    .eq("id", app.developer_id)
    .single();

  if (dev) {
    await adminClient.from("notifications").insert({
      user_id: dev.user_id,
      type: "app_approved",
      title: "App Approved! 🎉",
      body: `Your app "${app.name}" has been approved and is now live on AppHub.`,
      link: `/dashboard/developer/apps`,
      metadata: { app_id: appId },
    });
  }

  revalidatePath("/dashboard/admin/apps");
  return { success: "App approved and published" };
}

export async function rejectAppAction(
  _prevState: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { error: "Unauthorized" };

  const appId = formData.get("app_id")?.toString();
  const reason = formData.get("reason")?.toString();

  if (!appId) return { error: "App ID required" };
  if (!reason || reason.length < 10) return { error: "Please provide a detailed rejection reason (min 10 characters)" };

  const adminClient = createAdminClient();

  const { data: app, error } = await adminClient
    .from("applications")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", appId)
    .select("name, developer_id")
    .single();

  if (error || !app) return { error: error?.message ?? "App not found" };

  // Update payment status to rejected
  await adminClient
    .from("payments")
    .update({ status: "rejected" })
    .eq("application_id", appId);

  const { data: dev } = await adminClient
    .from("developers")
    .select("user_id")
    .eq("id", app.developer_id)
    .single();

  if (dev) {
    await adminClient.from("notifications").insert({
      user_id: dev.user_id,
      type: "app_rejected",
      title: "App Rejected",
      body: `Your app "${app.name}" was rejected. Reason: ${reason}`,
      link: `/dashboard/developer/apps`,
      metadata: { app_id: appId },
    });
  }

  revalidatePath("/dashboard/admin/apps");
  return { success: "App rejected" };
}

export async function requestChangesAction(
  _prevState: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { error: "Unauthorized" };

  const appId = formData.get("app_id")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!appId || !notes) return { error: "App ID and notes required" };

  const adminClient = createAdminClient();

  const { data: app, error } = await adminClient
    .from("applications")
    .update({ status: "changes_requested", admin_notes: notes })
    .eq("id", appId)
    .select("name, developer_id")
    .single();

  if (error || !app) return { error: error?.message ?? "App not found" };

  const { data: dev } = await adminClient
    .from("developers")
    .select("user_id")
    .eq("id", app.developer_id)
    .single();

  if (dev) {
    await adminClient.from("notifications").insert({
      user_id: dev.user_id,
      type: "changes_requested",
      title: "Changes Requested",
      body: `Admin has requested changes to "${app.name}": ${notes}`,
      link: `/dashboard/developer/apps`,
      metadata: { app_id: appId },
    });
  }

  revalidatePath("/dashboard/admin/apps");
  return { success: "Changes requested" };
}

export async function featureAppAction(appId: string, featured: boolean): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("applications")
    .update({ is_featured: featured })
    .eq("id", appId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/apps");
  revalidatePath("/");
  return { success: featured ? "App featured" : "App unfeatured" };
}

export async function adminPublishAppAction(appId: string): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("applications")
    .update({ status: "approved", published_at: new Date().toISOString() })
    .eq("id", appId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/apps");
  return { success: "App published instantly" };
}

export async function changeAppStatusAction(appId: string, status: AppStatus): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("applications")
    .update({ status })
    .eq("id", appId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/apps");
  return { success: `App status changed to ${status}` };
}

// ─── User Actions ─────────────────────────────────────────────────────────────

export async function submitReviewAction(
  _prevState: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in to leave a review" };

  const appId = formData.get("application_id")?.toString();
  if (!appId) return { error: "App ID required" };

  const parsed = reviewSchema.safeParse({
    rating: parseInt(formData.get("rating")?.toString() ?? "0"),
    title: formData.get("title")?.toString() || undefined,
    body: formData.get("body")?.toString() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .upsert({
      application_id: appId,
      user_id: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
    });

  if (error) return { error: error.message };

  revalidatePath(`/apps/${appId}`);
  return { success: "Review submitted" };
}

export async function toggleFavoriteAction(appId: string): Promise<AppActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("application_id", appId)
    .single();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    revalidatePath(`/apps/${appId}`);
    return { success: "Removed from favorites" };
  }

  await supabase.from("favorites").insert({ user_id: user.id, application_id: appId });
  revalidatePath(`/apps/${appId}`);
  return { success: "Added to favorites" };
}

export async function recordDownloadAction(appId: string, versionId?: string): Promise<void> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  await supabase.from("downloads").insert({
    application_id: appId,
    user_id: user?.id || null,
    version_id: versionId || null,
  });

  revalidatePath(`/apps/${appId}`);
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/dashboard");
}
