import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Return a signed upload URL for a report photo. Path convention: `{tenantId}/{reportId|new}/{filename}`. */
export const signUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        filename: z.string().min(1).max(120),
        subfolder: z.string().max(60).default("evidence"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.tenantId}/${data.subfolder}/${context.userId}/${Date.now()}-${safeName}`;
    const { data: signed, error } = await context.supabase.storage
      .from("report-photos")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

/** Return short-lived signed read URLs for a batch of storage paths. */
export const signReadUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ paths: z.array(z.string().min(1).max(400)).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("report-photos")
      .createSignedUrls(data.paths, 3600);
    if (error) throw new Error(error.message);
    return signed;
  });