"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/field";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const MAX_AVATAR_MB = 2;

/** Edit own name, research area, bio and photo. Username & role are admin-managed. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile.full_name);
  const [area, setArea] = useState(profile.research_area ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_AVATAR_MB} MB`);
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
    // Remove the previous avatar file (best effort).
    const prev = profile.avatar_url?.split("/avatars/")[1];
    if (prev && !updErr) await supabase.storage.from("avatars").remove([decodeURIComponent(prev)]);
    setUploading(false);
    if (updErr) return toast.error(updErr.message);
    setAvatar(data.publicUrl);
    toast.success("Photo updated");
    router.refresh();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Name is required");
    setSaving(true);
    const { error } = await createClient()
      .from("profiles")
      .update({ full_name: fullName.trim(), research_area: area.trim() || null, bio: bio.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar name={fullName} src={avatar} className="h-20 w-20 text-xl" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 rounded-full border-2 border-card bg-primary p-1.5 text-primary-foreground shadow transition-transform hover:scale-110 disabled:opacity-60"
            aria-label="Change photo"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        <div className="text-sm">
          <p className="font-medium">@{profile.username}</p>
          <p className="text-muted-foreground">{uploading ? "Uploading…" : `PNG, JPG or WebP up to ${MAX_AVATAR_MB} MB`}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Research area">
          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Medical image segmentation" />
        </Field>
        <Field label="Bio" className="sm:col-span-2">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="A few lines about your research interests" />
        </Field>
      </div>
      <Button type="submit" loading={saving}>{!saving && <Save />} Save profile</Button>
    </form>
  );
}
