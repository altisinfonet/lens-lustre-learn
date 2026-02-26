import { useState, useEffect, useMemo } from "react";
import { Clock, Trophy, Eye, Upload, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface Competition {
  status: string;
  starts_at: string;
  ends_at: string;
}

const phaseConfig: Record<string, { label: string; description: string; icon: any; className: string }> = {
  upcoming: {
    label: "Upcoming",
    description: "Submissions open soon",
    icon: Clock,
    className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
  open: {
    label: "Open for Submissions",
    description: "Submit your best work before the deadline",
    icon: Upload,
    className: "border-primary/30 bg-primary/5 text-primary",
  },
  judging: {
    label: "Judging in Progress",
    description: "Vote anonymously — participant details are hidden",
    icon: Eye,
    className: "border-yellow-500/30 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400",
  },
  closed: {
    label: "Competition Closed",
    description: "Winners have been announced — voting is closed",
    icon: Trophy,
    className: "border-foreground/10 bg-muted/30 text-muted-foreground",
  },
};

function useCountdown(targetDate: string) {
  const target = useMemo(() => new Date(targetDate).getTime(), [targetDate]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const isExpired = diff <= 0;

  return { days, hours, minutes, seconds, isExpired };
}

const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center min-w-[40px]">
    <span className="text-lg md:text-xl font-light tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[8px] tracking-[0.2em] uppercase opacity-60" style={{ fontFamily: "var(--font-heading)" }}>
      {label}
    </span>
  </div>
);

const Separator = () => (
  <span className="text-lg font-light opacity-30 -mt-2">:</span>
);

export default function PhaseBanner({ competition }: { competition: Competition }) {
  const config = phaseConfig[competition.status] || phaseConfig.upcoming;
  const Icon = config.icon;

  // Determine countdown target
  const countdownTarget =
    competition.status === "upcoming"
      ? competition.starts_at
      : competition.status === "open"
      ? competition.ends_at
      : competition.status === "judging"
      ? competition.ends_at // could be a separate judging_ends_at later
      : null;

  const countdownLabel =
    competition.status === "upcoming"
      ? "Opens in"
      : competition.status === "open"
      ? "Closes in"
      : competition.status === "judging"
      ? "Judging ends in"
      : null;

  const countdown = useCountdown(countdownTarget || new Date().toISOString());

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`border-b ${config.className}`}
    >
      <div className="container mx-auto px-6 md:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          <div>
            <span className="text-[10px] tracking-[0.25em] uppercase font-medium block" style={{ fontFamily: "var(--font-heading)" }}>
              {config.label}
            </span>
            <span className="text-[10px] opacity-70" style={{ fontFamily: "var(--font-body)" }}>
              {config.description}
            </span>
          </div>
        </div>

        {countdownTarget && !countdown.isExpired && (
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] tracking-[0.2em] uppercase opacity-50 mr-2" style={{ fontFamily: "var(--font-heading)" }}>
              {countdownLabel}
            </span>
            <CountdownUnit value={countdown.days} label="Days" />
            <Separator />
            <CountdownUnit value={countdown.hours} label="Hrs" />
            <Separator />
            <CountdownUnit value={countdown.minutes} label="Min" />
            <Separator />
            <CountdownUnit value={countdown.seconds} label="Sec" />
          </div>
        )}

        {competition.status === "closed" && (
          <div className="flex items-center gap-1.5 opacity-50">
            <Lock className="h-3 w-3" />
            <span className="text-[9px] tracking-[0.15em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              Final Results
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
