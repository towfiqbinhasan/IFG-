"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/** Lab-wide settings stored in the single-row app_settings table. */
export function SettingsCard({ allowMemberVenues }: { allowMemberVenues: boolean }) {
  const router = useRouter();
  const [allow, setAllow] = useState(allowMemberVenues);

  async function toggle(v: boolean) {
    setAllow(v);
    const { error } = await createClient().from("app_settings").update({ allow_member_venues: v, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) {
      setAllow(!v);
      return toast.error(error.message);
    }
    toast.success(v ? "Members can now add venues" : "Only admins can add venues");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lab settings</CardTitle>
        <CardDescription>Permissions for regular members.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="allow-venues" className="flex flex-col gap-1">
            <span>Members can add conferences & journals</span>
            <span className="text-xs font-normal text-muted-foreground">They can then edit/delete only venues they created.</span>
          </Label>
          <Switch id="allow-venues" checked={allow} onCheckedChange={toggle} />
        </div>
      </CardContent>
    </Card>
  );
}
