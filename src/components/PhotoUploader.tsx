import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signUploadUrl } from "@/lib/storage.functions";
import { toast } from "sonner";

export function PhotoUploader({
  tenantId,
  subfolder = "evidence",
  value,
  onChange,
  max = 5,
}: {
  tenantId: string;
  subfolder?: string;
  value: string[];
  onChange: (paths: string[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sign = useServerFn(signUploadUrl);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (value.length + files.length > max) {
      toast.error(`You can only attach ${max} photo${max === 1 ? "" : "s"}`);
      return;
    }
    setBusy(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 8MB`);
          continue;
        }
        const { path, token } = await sign({
          data: { tenantId, filename: file.name, subfolder },
        });
        const { error } = await supabase.storage
          .from("report-photos")
          .uploadToSignedUrl(path, token, file, { contentType: file.type });
        if (error) throw error;
        uploaded.push(path);
      }
      onChange([...value, ...uploaded]);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((p) => (
          <div
            key={p}
            className="group relative flex h-20 w-20 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground"
          >
            <span className="truncate px-2">{p.split("/").pop()}</span>
            <button
              type="button"
              className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
              onClick={() => onChange(value.filter((x) => x !== p))}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
            {busy ? "Uploading…" : "Add photo"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground">
        Up to {max} photos, 8MB each. Photos are stored privately.
      </p>
    </div>
  );
}