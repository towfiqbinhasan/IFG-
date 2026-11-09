import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, MessageCircle, Pencil, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { MemberStats } from "@/components/members/member-stats";
import { PaperList } from "@/components/papers/paper-list";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, PREP_SELECT, normalizePapers, normalizePreps } from "@/lib/queries";
import { PrepCard } from "@/components/progress/prep-card";
import { StaggerItem, StaggerList } from "@/components/shared/motion";
import type { Profile, Topic } from "@/lib/types";

/** Public (read-only) member profile with their dashboard and papers. */
export default async function MemberProfilePage({ params }: { params: { username: string } }) {
  const { supabase, profile: me } = await getSessionProfile();
  const { data: p } = await supabase.from("profiles").select("*").eq("username", params.username.toLowerCase()).maybeSingle();
  if (!p) notFound();
  const member = p as Profile;

  const [{ data: rows }, { data: topics }, { data: prepRows }] = await Promise.all([
    supabase.from("papers").select(PAPER_SELECT).eq("user_id", member.id).order("created_at", { ascending: false }),
    supabase.from("topics").select("*").order("name"),
    supabase.from("preparations").select(PREP_SELECT).eq("user_id", member.id).order("updated_at", { ascending: false }),
  ]);
  const preps = normalizePreps(prepRows);
  const papers = normalizePapers(rows);
  const isMe = member.id === me.id;

  return (
    <div className="space-y-8">
      <Link href="/members" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Members
      </Link>

      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-emerald-400/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end">
          <UserAvatar name={member.full_name} src={member.avatar_url} className="h-24 w-24 border-4 border-card text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              {member.full_name}
              {member.role === "admin" && <Shield className="h-5 w-5 text-primary" aria-label="Admin" />}
            </h1>
            <p className="text-sm text-muted-foreground">@{member.username}{member.research_area ? ` · ${member.research_area}` : ""}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Joined {format(new Date(member.joined_at), "MMMM yyyy")}
            </p>
          </div>
          {isMe ? (
            <Button variant="outline" asChild>
              <Link href="/profile"><Pencil /> Edit profile</Link>
            </Button>
          ) : (
            member.is_active && (
              <Button variant="forge" asChild>
                <Link href={`/messages?to=${member.id}`}><MessageCircle /> Message</Link>
              </Button>
            )
          )}
        </div>
        {member.bio && <p className="relative mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed">{member.bio}</p>}
      </Card>

      <MemberStats papers={papers} />

      {preps.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">{isMe ? "My preparations" : `${member.full_name.split(" ")[0]}'s preparations`}</h2>
          <StaggerList className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {preps.map((p) => (
              <StaggerItem key={p.id}><PrepCard prep={p} currentUserId={me.id} showAuthor={false} /></StaggerItem>
            ))}
          </StaggerList>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">{isMe ? "My papers" : `${member.full_name.split(" ")[0]}'s papers`}</h2>
        <PaperList
          papers={papers}
          topics={(topics ?? []) as Topic[]}
          emptyTitle="No papers logged yet"
          emptyDescription={isMe ? "Your logged papers appear here." : "This member hasn't logged any papers yet."}
        />
      </section>
    </div>
  );
}
