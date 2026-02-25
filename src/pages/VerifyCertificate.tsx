import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, CheckCircle, Search, XCircle, Calendar, Shield } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

interface VerifiedCert {
  id: string;
  title: string;
  description: string | null;
  type: string;
  issued_at: string;
  recipient_name: string | null;
}

const VerifyCertificate = () => {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("id") || "";
  const [certId, setCertId] = useState(initialId);
  const [result, setResult] = useState<VerifiedCert | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleVerify = async () => {
    const trimmed = certId.trim();
    if (!trimmed) return;

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      setNotFound(true);
      setResult(null);
      setSearched(true);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setResult(null);

    const { data, error } = await supabase.rpc("verify_certificate", { _cert_id: trimmed });

    if (error || !data || data.length === 0) {
      setNotFound(true);
    } else {
      setResult(data[0] as VerifiedCert);
    }
    setSearched(true);
    setLoading(false);
  };

  // Auto-verify if ID is in URL params
  useState(() => {
    if (initialId) {
      handleVerify();
    }
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Verify Certificate" }]} />
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Verification
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Verify <em className="italic text-primary">Certificate</em>
            </h1>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              Enter a certificate ID to verify its authenticity.
            </p>
          </div>

          {/* Search */}
          <div className="flex gap-3 mb-10">
            <Input
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
              className="bg-transparent font-mono text-sm"
              maxLength={36}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
            <Button
              onClick={handleVerify}
              disabled={loading || !certId.trim()}
              className="shrink-0 bg-primary text-primary-foreground text-xs tracking-[0.1em] uppercase px-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              {loading ? "Checking…" : "Verify"}
            </Button>
          </div>

          {/* Result: Valid */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="border border-primary/30 p-8 md:p-10"
            >
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  Valid Certificate
                </span>
              </div>

              <div className="flex items-start gap-5 mb-6">
                <div className="shrink-0 w-14 h-14 flex items-center justify-center bg-primary/10 rounded-full">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-light tracking-tight mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {result.title}
                  </h2>
                  {result.description && (
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                      {result.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-5 space-y-3">
                <div className="flex justify-between text-xs" style={{ fontFamily: "var(--font-body)" }}>
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="text-foreground">{result.recipient_name || "—"}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ fontFamily: "var(--font-body)" }}>
                  <span className="text-muted-foreground">Type</span>
                  <span className="tracking-[0.15em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    {result.type.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between text-xs" style={{ fontFamily: "var(--font-body)" }}>
                  <span className="text-muted-foreground">Issued</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {new Date(result.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between text-xs" style={{ fontFamily: "var(--font-body)" }}>
                  <span className="text-muted-foreground">Certificate ID</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{result.id}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result: Not found */}
          {searched && notFound && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="border border-destructive/30 p-8 text-center"
            >
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Certificate Not Found
              </p>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                The certificate ID you entered does not match any records. Please double-check and try again.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </main>
  );
};

export default VerifyCertificate;
