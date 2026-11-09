import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PaperForm } from "@/components/papers/paper-form";
import { getSessionProfile } from "@/lib/session";
import { PAPER_SELECT, normalizePapers } from "@/lib/queries";
import type { Topic } from "@/lib/types";

export const metadata = { title: "Edit paper" };

export default async function EditPaperPage({ params }: { params: { id: string } }) {
  const { supabase, profile } = await getSessionProfile();
  const [{ data: row }, { data: topics }] = await Promise.all([
    supabase.from("papers").select(PAPER_SELECT).eq("id", params.id).maybeSingle(),
    supabase.from("topics").select("*").order("name"),
  ]);
  if (!row) notFound();
  const [paper] = normalizePapers([row]);
  // Members can only edit their own entries (also enforced by RLS).
  if (paper!.user_id !== profile.id) redirect(`/papers/${params.id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit paper" description={paper!.title} />
      <PaperForm paper={paper} topics={(topics ?? []) as Topic[]} userId={profile.id} />
    </div>
  );
}
