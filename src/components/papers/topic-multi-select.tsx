"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { SERIES_VARS } from "@/lib/constants";
import type { Topic } from "@/lib/types";

// Fixed hex palette for newly created topics (mirrors the light series tokens).
const TOPIC_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

/**
 * Multi-select for research topics with type-ahead and inline creation.
 * New topics are inserted into the shared `topics` table immediately.
 */
export function TopicMultiSelect({
  allTopics,
  value,
  onChange,
  onTopicCreated,
  userId,
}: {
  allTopics: Topic[];
  value: string[];
  onChange: (ids: string[]) => void;
  onTopicCreated: (t: Topic) => void;
  userId: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value.map((id) => allTopics.find((t) => t.id === id)).filter(Boolean) as Topic[];
  const q = query.trim().toLowerCase();
  const suggestions = useMemo(
    () => allTopics.filter((t) => !value.includes(t.id) && (!q || t.name.toLowerCase().includes(q))).slice(0, 8),
    [allTopics, value, q],
  );
  const exact = allTopics.find((t) => t.name.toLowerCase() === q);

  function add(id: string) {
    onChange([...value, id]);
    setQuery("");
    inputRef.current?.focus();
  }

  async function create() {
    const name = query.trim().replace(/\s+/g, " ");
    if (!name || name.length > 60) return;
    setCreating(true);
    const color = TOPIC_COLORS[allTopics.length % TOPIC_COLORS.length];
    const { data, error } = await createClient()
      .from("topics")
      .insert({ name, color, created_by: userId })
      .select("*")
      .single();
    setCreating(false);
    if (error) return toast.error(error.code === "23505" ? "That topic already exists." : error.message);
    onTopicCreated(data as Topic);
    add((data as Topic).id);
    toast.success(`Topic “${name}” created`);
  }

  return (
    <div className="relative">
      <div
        className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background"
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence initial={false}>
          {selected.map((t, i) => (
            <motion.span
              key={t.id}
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: t.color ?? SERIES_VARS[i % 8] }} />
              {t.name}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== t.id))}
                className="rounded-full p-0.5 hover:bg-background"
                aria-label={`Remove ${t.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions[0] && (exact || !q)) add(exact?.id ?? suggestions[0].id);
              else if (q && !exact) void create();
            } else if (e.key === "Backspace" && !query && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={selected.length ? "" : "Search or create topics…"}
          className="h-7 min-w-[8rem] flex-1 border-0 p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label="Topics"
        />
      </div>

      <AnimatePresence>
        {open && (suggestions.length > 0 || (q && !exact)) && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
          >
            {suggestions.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(t.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color ?? "hsl(var(--primary))" }} />
                  {t.name}
                </button>
              </li>
            ))}
            {q && !exact && (
              <li>
                <button
                  type="button"
                  disabled={creating}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void create()}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                >
                  <Plus className="h-4 w-4" /> Create “{query.trim()}”
                </button>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
