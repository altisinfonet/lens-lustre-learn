import { calcProfileCompletion } from "@/lib/profileCompletion";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";

interface Props {
  profile: Record<string, any>;
  className?: string;
  showSections?: boolean;
}

const ProfileCompletionBar = ({ profile, className = "", showSections = false }: Props) => {
  const { total, sections } = calcProfileCompletion(profile);

  const color =
    total === 100
      ? "text-green-500"
      : total >= 60
      ? "text-yellow-500"
      : "text-destructive";

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Profile Completion
        </span>
        <span
          className={`text-sm font-semibold ${color}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {total}%
        </span>
      </div>
      <Progress value={total} className="h-2" />

      {showSections && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {sections.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              {s.completed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />
              )}
              <span style={{ fontFamily: "var(--font-body)" }}>
                {s.label} ({s.percentage}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileCompletionBar;
