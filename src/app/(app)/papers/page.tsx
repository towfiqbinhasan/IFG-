import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { PaperList } from "@/components/papers/paper-list";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, normalizePapers } from "@/lib/queries";
import type { Topic } from "@/lib/types";

export const metadata = { title: "My papers" };

export default async function MyPapersPage() {
  const { supabase, profile } = await getSessionProfile();
  const [{ data: rows }, { data: topics }] = await Promise.all([
    supabase.from("papers").select(PAPER_SELECT).eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("topics").select("*").order("name"),
  ]);
  const papers = normalizePapers(rows);

  const addButton = (
    <Button asChild variant="forge">
      <Link href="/papers/new">
        <Plus /> Add paper
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="My paper log" description="Everything you have read, are reading, or plan to read." actions={addButton} />
      <PaperList
        papers={papers}
        topics={(topics ?? []) as Topic[]}
        emptyTitle="Your reading log is empty"
        emptyDescription="Add the first paper you are reading — summary, notes and all."
        emptyAction={addButton}
      />
    </>
  );
}
