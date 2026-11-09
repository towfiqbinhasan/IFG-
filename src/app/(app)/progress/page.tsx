import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { PrepBoard } from "@/components/progress/prep-board";
import { PrepFormDialog } from "@/components/progress/prep-form-dialog";
import { ProgressSetupNotice } from "@/components/progress/setup-notice";
import { getSessionProfile } from "@/lib/session";
import { PREP_SELECT, isMissingTable, normalizePreps } from "@/lib/queries";
import type { ProfileLite, Topic } from "@/lib/types";

export const metadata = { title: "Progress" };

/** Lab-wide board of what everyone is preparing and how far they've got. */
export default async function ProgressPage({ searchParams }: { searchParams: { topic?: string } }) {
  const { supabase, profile } = await getSessionProfile();
  const [{ data: rows, error }, { data: topics }, { data: members }] = await Promise.all([
    supabase.from("preparations").select(PREP_SELECT).order("updated_at", { ascending: false }),
    supabase.from("topics").select("id, name").order("name"),
    supabase.from("profiles").select("id, username, full_name, avatar_url").eq("is_active", true).order("full_name"),
  ]);
  const topicList = (topics ?? []) as Pick<Topic, "id" | "name">[];

  const addButton = (
    <PrepFormDialog topics={topicList} userId={profile.id} defaultTopicId={searchParams.topic} trigger={<Button variant="forge"><Plus /> New preparation</Button>} />
  );

  return (
    <>
      <PageHeader
        title="Lab progress"
        description="What everyone is preparing, how far they've got, and the latest updates."
        actions={!error && addButton}
      />
      {isMissingTable(error) ? (
        <ProgressSetupNotice />
      ) : (
        <PrepBoard
          preps={normalizePreps(rows)}
          topics={topicList}
          members={(members ?? []) as ProfileLite[]}
          currentUserId={profile.id}
          initialTopic={searchParams.topic}
          emptyAction={addButton}
        />
      )}
    </>
  );
}
