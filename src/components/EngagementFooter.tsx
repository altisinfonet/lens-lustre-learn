import { Eye, TrendingUp, Trophy, Clock, BarChart3 } from "lucide-react";
import { getSimulatedStats, type SimulatedStats } from "@/lib/simulatedEngagement";
import T from "@/components/T";

const headingFont = { fontFamily: "var(--font-heading)" };

interface EngagementFooterProps {
  id: string;
  createdAt: string;
  wordCount?: number;
  className?: string;
}

const EngagementFooter = ({ id, createdAt, wordCount, className = "" }: EngagementFooterProps) => {
  const stats = getSimulatedStats(id, createdAt, wordCount);

  if (!stats.show) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 text-xs text-muted-foreground ${className}`}>
      {/* Views */}
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" />
        <T>Viewed by</T> <span className="font-semibold text-foreground">{stats.viewsLabel}</span>
      </span>

      {/* Reach */}
      <span className="inline-flex items-center gap-1">
        <BarChart3 className="h-3.5 w-3.5" />
        <T>Reached</T> <span className="font-semibold text-foreground">{stats.reachLabel}</span>
      </span>

      {/* Read time */}
      {stats.readTimeMin && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {stats.readTimeMin} <T>min read</T>
        </span>
      )}

      {/* Trending badge */}
      {stats.isTrending && (
        <span className="inline-flex items-center gap-1 text-orange-500 font-semibold" style={headingFont}>
          <TrendingUp className="h-3.5 w-3.5" />
          <T>Trending</T>
        </span>
      )}

      {/* Top post badge */}
      {stats.isTopPost && (
        <span className="inline-flex items-center gap-1 text-amber-500 font-semibold" style={headingFont}>
          <Trophy className="h-3.5 w-3.5" />
          <T>Top Post</T>
        </span>
      )}
    </div>
  );
};

export default EngagementFooter;
