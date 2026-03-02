import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import T from "@/components/T";
import { Send, Clock, CheckCircle, MessageSquare, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

interface Reply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

interface Props {
  user: any;
}

const AdminSupportTickets = ({ user }: Props) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set((data as any[]).map((t: any) => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      setTickets(
        (data as any[]).map((t: any) => ({
          ...t,
          user_name: profileMap.get(t.user_id) || "Unknown User",
        }))
      );
    } else {
      setTickets([]);
    }
    setLoading(false);
  };

  const fetchReplies = async (ticketId: string) => {
    const { data } = await supabase
      .from("ticket_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setReplies((prev) => ({ ...prev, [ticketId]: (data as any[]) || [] }));
  };

  const handleToggle = (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(ticketId);
      fetchReplies(ticketId);
    }
  };

  const handleSendReply = async (ticketId: string) => {
    const text = replyText[ticketId]?.trim();
    if (!text || !user) return;
    setSendingReply(ticketId);

    await supabase.from("ticket_replies").insert({
      ticket_id: ticketId,
      user_id: user.id,
      message: text,
      is_admin: true,
    } as any);

    // Update ticket status to replied
    await supabase.from("support_tickets").update({ status: "replied", updated_at: new Date().toISOString() } as any).eq("id", ticketId);

    setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
    setSendingReply(null);
    fetchReplies(ticketId);
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: "replied", updated_at: new Date().toISOString() } : t));
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    await supabase.from("support_tickets").update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq("id", ticketId);
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
    toast({ title: `Ticket marked as ${newStatus}` });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "open": return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
      case "replied": return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
      case "resolved": return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case "closed": return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  if (loading) {
    return (
      <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse py-12 text-center" style={{ fontFamily: "var(--font-heading)" }}>
        Loading tickets...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          {["all", "open", "replied", "resolved", "closed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-all ${filter === f ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-foreground"}`}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-border p-10 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            No tickets found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div key={ticket.id} className="border border-border">
              {/* Header */}
              <button
                onClick={() => handleToggle(ticket.id)}
                className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                {statusIcon(ticket.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-body)" }}>
                    {ticket.subject}
                  </p>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                    <span className="text-foreground/70">{ticket.user_name}</span>
                    {" · "}
                    {new Date(ticket.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    <span className={ticket.status === "open" ? "text-yellow-500" : ticket.status === "replied" ? "text-primary" : ticket.status === "resolved" ? "text-green-500" : "text-muted-foreground"}>
                      {ticket.status.toUpperCase()}
                    </span>
                  </p>
                </div>
                {expandedTicket === ticket.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {/* Thread */}
              {expandedTicket === ticket.id && (
                <div className="border-t border-border px-6 py-4 space-y-4">
                  {/* Status actions */}
                  <div className="flex gap-2 mb-3">
                    {ticket.status !== "resolved" && (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, "resolved")}
                        className="text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border border-green-500/30 text-green-500 hover:bg-green-500/10 transition-all"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <T>Mark Resolved</T>
                      </button>
                    )}
                    {ticket.status !== "closed" && (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, "closed")}
                        className="text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground transition-all"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <T>Close Ticket</T>
                      </button>
                    )}
                    {(ticket.status === "resolved" || ticket.status === "closed") && (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, "open")}
                        className="text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-all"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <T>Reopen</T>
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  {(replies[ticket.id] || []).map((reply) => (
                    <div
                      key={reply.id}
                      className={`flex ${reply.is_admin ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] px-4 py-3 rounded-lg ${reply.is_admin ? "bg-primary/10 border border-primary/20" : "bg-muted/50 border border-border"}`}>
                        <p className="text-[9px] tracking-[0.15em] uppercase mb-1.5 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                          {reply.is_admin ? (
                            <span className="text-primary">50mm Retina (You)</span>
                          ) : (
                            <span className="text-muted-foreground">{ticket.user_name}</span>
                          )}
                          <span className="text-muted-foreground/50 ml-2 font-normal">
                            {new Date(reply.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap" style={{ fontFamily: "var(--font-body)" }}>
                          {reply.message}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Admin Reply */}
                  <div className="flex gap-3 pt-2">
                    <textarea
                      value={replyText[ticket.id] || ""}
                      onChange={(e) => setReplyText((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                      placeholder="Type your reply to the user..."
                      maxLength={2000}
                      rows={2}
                      className="flex-1 bg-transparent border border-border focus:border-primary outline-none p-3 text-sm resize-none"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                    <button
                      onClick={() => handleSendReply(ticket.id)}
                      disabled={sendingReply === ticket.id || !replyText[ticket.id]?.trim()}
                      className="self-end inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase px-4 py-2.5 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <Send className="h-3 w-3" /> Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSupportTickets;
