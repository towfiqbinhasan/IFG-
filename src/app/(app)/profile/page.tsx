import Link from "next/link";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getSessionProfile } from "@/lib/session";

export const metadata = { title: "Profile & settings" };

export default async function ProfilePage() {
  const { profile } = await getSessionProfile();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Profile & settings"
        description={`Member since ${format(new Date(profile.joined_at), "MMMM d, yyyy")} · ${profile.role}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/members/${profile.username}`}><ExternalLink /> View public profile</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Visible to everyone in the lab.</CardDescription>
        </CardHeader>
        <CardContent><ProfileForm profile={profile} /></CardContent>
      </Card>
      <Card id="password" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>You&apos;ll stay signed in on this device.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <ChangePasswordForm username={profile.username} forced={false} variant="inline" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Switch between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-sm">
          <ThemeToggle /> Toggle theme
        </CardContent>
      </Card>
    </div>
  );
}
