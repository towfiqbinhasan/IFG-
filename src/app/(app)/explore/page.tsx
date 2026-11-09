import { PageHeader } from "@/components/shared/page-header";
import { PaperList } from "@/components/papers/paper-list";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, normalizePapers } from "@/lib/queries";
import type { ProfileLite, Topic } from "@/lib/types";

export const metadata = { title: "Explore papers" };

/** Lab-wide paper explorer: search & filter across everyone's logs. */
export default async function ExplorePage({ searchParams }: { searchParams: { member?: string; topic?: string } }) {
  const { supabase } = await getSessionProfile();
  const [{ data: rows }, { data: topics }, { data: members }] = await Promise.all([
    supabase.from("papers").select(PAPER_SELECT).order("created_at", { ascending: false }).limit(2000),
    supabase.from("topics").select("*").order("name"),
    supabase.from("profiles").select("id, username, full_name, avatar_url").order("full_name"),
  ]);

  return (
    <>
      <PageHeader title="Papers explorer" description="Search and filter every paper logged across the lab." />
      <PaperList
        papers={normalizePapers(rows)}
        topics={(topics ?? []) as Topic[]}
        members={(members ?? []) as ProfileLite[]}
        showAuthor
        initial={{ member: searchParams.member ?? "all", topic: searchParams.topic ?? "all" }}
        emptyTitle="No papers in the lab yet"
        emptyDescription="Once members start logging papers, they will show up here."
      />
    </>
  );
}
