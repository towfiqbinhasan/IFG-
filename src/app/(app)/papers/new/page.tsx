import { PageHeader } from "@/components/shared/page-header";
import { PaperForm } from "@/components/papers/paper-form";
import { getSessionProfile } from "@/lib/session";
import type { Topic } from "@/lib/types";

export const metadata = { title: "Add paper" };

export default async function NewPaperPage() {
  const { supabase, profile } = await getSessionProfile();
  const { data: topics } = await supabase.from("topics").select("*").order("name");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add a paper" description="Log a paper to your reading list." />
      <PaperForm topics={(topics ?? []) as Topic[]} userId={profile.id} />
    </div>
  );
}
