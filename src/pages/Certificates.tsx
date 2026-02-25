import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Download, Calendar, Share2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateCertificatePdf } from "@/lib/generateCertificatePdf";
import { toast } from "@/hooks/use-toast";
import GlobalSearch from "@/components/GlobalSearch";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

interface Certificate {
  id: string;
  title: string;
  description: string | null;
  type: string;
  issued_at: string;
  reference_id: string | null;
  file_url: string | null;
}

const Certificates = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchCerts = async () => {
      const [{ data: certs }, { data: profile }] = await Promise.all([
        supabase.from("certificates").select("*").eq("user_id", user.id).order("issued_at", { ascending: false }),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      setCertificates(certs || []);
      setDisplayName(profile?.full_name || user.email?.split("@")[0] || "Photographer");
      setLoading(false);
    };
    fetchCerts();
  }, [user]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Certificates" }]} />
          <GlobalSearch />
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-4xl">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="mb-12">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-px bg-primary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Achievements
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              My <em className="italic text-primary">Certificates</em>
            </h1>
          </motion.div>

          {certificates.length === 0 ? (
            <motion.div variants={fadeUp} custom={1} className="border border-border p-12 text-center">
              <Award className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: "var(--font-body)" }}>
                No certificates yet.
              </p>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                Complete a course to earn your first certificate!
              </p>
              <Link
                to="/courses"
                className="inline-block mt-6 text-xs tracking-[0.15em] uppercase px-5 py-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Browse Courses
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {certificates.map((cert, i) => (
                <motion.div
                  key={cert.id}
                  variants={fadeUp}
                  custom={i + 1}
                  className="border border-border p-6 md:p-8 hover:border-primary/30 transition-all duration-500"
                >
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-primary/10 rounded-full">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-light tracking-tight mb-1" style={{ fontFamily: "var(--font-display)" }}>
                        {cert.title}
                      </h3>
                      {cert.description && (
                        <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
                          {cert.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(cert.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <span className="tracking-[0.2em] uppercase px-2 py-0.5 border border-primary/30 text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                          {cert.type}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col gap-3 items-end">
                      <button
                        onClick={() => {
                          try {
                            const certName = cert.title
                              .replace(" — Completion Certificate", "")
                              .replace(" — Winner Certificate", "");
                            const doc = generateCertificatePdf({
                              recipientName: displayName,
                              courseTitle: certName,
                              issueDate: new Date(cert.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                              certificateId: cert.id,
                              type: cert.type === "competition_winner" ? "competition" : "course",
                            });
                            doc.save(`ArteFoto-Certificate-${cert.id.slice(0, 8)}.pdf`);
                          } catch {
                            toast({ title: "Download failed", variant: "destructive" });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-2 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-500"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <Download className="h-3 w-3" />
                        PDF
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/verify?id=${cert.id}`;
                          navigator.clipboard.writeText(url).then(() => {
                            toast({ title: "Link copied!", description: "Verification link copied to clipboard." });
                          }).catch(() => {
                            toast({ title: "Copy failed", variant: "destructive" });
                          });
                        }}
                        className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-2 border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all duration-500"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <Share2 className="h-3 w-3" />
                        Share
                      </button>
                      {cert.reference_id && (
                        <Link
                          to={cert.type === "competition_winner" ? `/competitions/${cert.reference_id}` : `/courses/${cert.reference_id}`}
                          className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-primary transition-colors"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {cert.type === "competition_winner" ? "View Competition" : "View Course"}
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
};

export default Certificates;
