"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";

/** Opens a short-lived signed URL for the private PDF. */
export function PdfButton({ path, label = "PDF" }: { path: string; label?: string }) {
  async function open() {
    const { data, error } = await createClient().storage.from("papers").createSignedUrl(path, 60 * 10);
    if (error || !data) return toast.error("Could not open PDF");
    window.open(data.signedUrl, "_blank", "noopener");
  }
  return (
    <Button variant="outline" onClick={open}>
      <Download /> {label}
    </Button>
  );
}

/** Edit / delete controls (rendered only for the owner or an admin). */
export function PaperOwnerActions({
  id,
  pdfPath,
  reviewPdfPath,
  canEdit,
}: {
  id: string;
  pdfPath: string | null;
  reviewPdfPath?: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  async function remove() {
    const supabase = createClient();
    const files = [pdfPath, reviewPdfPath].filter(Boolean) as string[];
    if (files.length) await supabase.storage.from("papers").remove(files);
    const { error } = await supabase.from("papers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Paper deleted");
    router.push("/papers");
    router.refresh();
  }
  return (
    <>
      {canEdit && (
        <Button variant="outline" asChild>
          <Link href={`/papers/${id}/edit`}>
            <Pencil /> Edit
          </Link>
        </Button>
      )}
      <ConfirmDialog
        trigger={
          <Button variant="outline" className="text-destructive hover:text-destructive">
            <Trash2 /> Delete
          </Button>
        }
        title="Delete this paper?"
        description="This permanently removes the entry, its topic links and any attached PDF."
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </>
  );
}
