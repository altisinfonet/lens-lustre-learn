import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import JudgingStampBadge from "./JudgingStampBadge";

interface TagInfo {
  id: string;
  label: string;
  color: string;
  icon: string;
  image_url: string | null;
}

interface Props {
  entryId: string;
  className?: string;
}

/**
 * Displays judging tag stamps overlaid on a competition entry image.
 * Fetches tag assignments for the entry and renders gold-style stamp badges.
 * Automatically updates when tags are added/removed via realtime.
 */
const EntryTagStamps = ({ entryId, className = "" }: Props) => {
  const [tags, setTags] = useState<TagInfo[]>([]);

  const fetchTags = async () => {
    const { data: assignments } = await supabase
      .from("judge_tag_assignments")
      .select("tag_id")
      .eq("entry_id", entryId);

    if (!assignments || assignments.length === 0) {
      setTags([]);
      return;
    }

    // Get unique tag IDs
    const uniqueTagIds = [...new Set(assignments.map((a) => a.tag_id))];

    const { data: tagData } = await supabase
      .from("judging_tags" as any)
      .select("id, label, color, icon, image_url")
      .in("id", uniqueTagIds);

    setTags(
      (tagData as any[] || []).map((t) => ({
        id: t.id,
        label: t.label,
        color: t.color,
        icon: t.icon || "award",
        image_url: t.image_url || null,
      }))
    );
  };

  useEffect(() => {
    fetchTags();

    // Listen for realtime changes to tag assignments for this entry
    const channel = supabase
      .channel(`entry-tags-${entryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "judge_tag_assignments",
          filter: `entry_id=eq.${entryId}`,
        },
        () => fetchTags()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entryId]);

  if (tags.length === 0) return null;

  return (
    <div className={`absolute top-2 right-2 flex flex-col gap-1 z-10 ${className}`}>
      {tags.map((tag) => (
        <JudgingStampBadge
          key={tag.id}
          label={tag.label}
          color={tag.color}
          icon={tag.icon}
          imageUrl={tag.image_url}
          size="sm"
        />
      ))}
    </div>
  );
};

export default EntryTagStamps;
