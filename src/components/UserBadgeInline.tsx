import { BADGES, type BadgeType } from "@/lib/badgeConfig";
import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  badges: string[];
  /** compact = just blue tick + tiny labels; full = slightly bigger labels */
  size?: "compact" | "full";
}

/**
 * Renders inline badge indicators next to a username.
 * - "verified" badge → blue checkmark icon (like Twitter/Facebook)
 * - Other badges → tiny colored label pills
 */
const UserBadgeInline = ({ badges, size = "compact" }: Props) => {
  if (!badges || badges.length === 0) return null;

  const isVerified = badges.includes("verified");
  const otherBadges = badges.filter((b) => b !== "verified");

  const labelSize = size === "compact" ? "text-[7px] px-1 py-px" : "text-[8px] px-1.5 py-0.5";
  const tickSize = size === "compact" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {isVerified && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <BadgeCheck
                className={`${tickSize} text-blue-500 fill-blue-500 shrink-0 cursor-pointer`}
                aria-label="Verified Profile"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
              Verified Profile
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {otherBadges.map((b) => {
        const cfg = BADGES[b as BadgeType];
        if (!cfg) return null;
        return (
          <span
            key={b}
            className={`inline-flex items-center gap-0.5 ${labelSize} tracking-[0.06em] uppercase font-semibold rounded-sm border shrink-0 leading-none ${cfg.badgeClass}`}
          >
            <span className="text-[8px]">{cfg.icon}</span>
            {cfg.label}
          </span>
        );
      })}
    </span>
  );
};

export default UserBadgeInline;
