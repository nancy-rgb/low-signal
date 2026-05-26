import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import {
  HELP_TYPES,
  useAliases,
  useClaims,
  useDecideClaim,
  useRequest,
  useUpdateRequest,
  useCheckIns,
  useSendCheckIn,
  useMessages,
  useSendMessage,
  useRealtimeRequest,
} from "@/lib/data";
import {
  usePeerPublicKey,
  encryptForPeer,
  decryptFromPeer,
  isE2EEEnvelope,
} from "@/lib/e2ee";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/request/$id")({ component: RequestDetail });

function RequestDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: req, isLoading } = useRequest(id);
  const { data: claims = [] } = useClaims(id);
  const { data: checkIns = [] } = useCheckIns(id);
  const { data: messages = [] } = useMessages(id);
  const aliasMap = useAliases([
    ...(req ? [req.requester_id] : []),
    ...claims.map((c) => c.volunteer_id),
    ...checkIns.map((c) => c.sender_id),
    ...messages.map((m) => m.sender_id),
  ]).data ?? {};

  const decide = useDecideClaim();
  const update = useUpdateRequest();
  const sendCheckIn = useSendCheckIn();
  const sendMessage = useSendMessage();

  // Realtime subscriptions for live updates
  useRealtimeRequest(id);

  // Derive peer (the OTHER participant) for E2EE
  const approvedClaimEarly = (claims ?? []).find((c) => c.status === "approved");
  const peerId =
    req && user
      ? req.requester_id === user.id
        ? approvedClaimEarly?.volunteer_id ?? null
        : approvedClaimEarly?.volunteer_id === user.id
        ? req.requester_id
        : null
      : null;
  const { data: peerPubKey } = usePeerPublicKey(peerId);

  const [msgText, setMsgText] = useState("");
  const [customCheckIn, setCustomCheckIn] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) return <AppShell><div className="p-4 text-sm">Loading…</div></AppShell>;
  if (!req) {
    return (
      <AppShell>
        <div className="p-4">
          <p>Request not found.</p>
          <Link to="/" className="text-sm underline">← Home</Link>
        </div>
      </AppShell>
    );
  }

  const isOwner = req.requester_id === user?.id;
  const approvedClaim = claims.find((c) => c.status === "approved");
  const isApprovedVolunteer = approvedClaim?.volunteer_id === user?.id;
  const canSeeExact = isOwner || isApprovedVolunteer;
  const isParticipant = canSeeExact; // shorthand for approved pair
  const typeLabel = HELP_TYPES.find((t) => t.id === req.help_type)?.label;

  // Safety timer logic
  const safetyOverdue = req.safety_deadline && new Date(req.safety_deadline) < new Date();
  const hasSafeCheckIn = checkIns.some((c) => c.kind === "safe");

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <div>
          <h1 className="text-xl font-semibold">{typeLabel}</h1>
          <StatusBadge status={req.status} />
        </div>

        {/* Safety timer banner */}
        {req.safety_deadline && !hasSafeCheckIn && (
          <div className={`rounded-md border p-3 text-sm ${safetyOverdue ? "border-destructive bg-destructive/10" : "border-warning bg-warning/10"}`}>
            <div className="font-medium">
              {safetyOverdue ? "⚠ Safety deadline passed" : "Safety timer active"}
            </div>
            <div className="text-xs text-muted-foreground">
              Deadline: {new Date(req.safety_deadline).toLocaleString()}
            </div>
            {isParticipant && (
              <button
                onClick={() => sendCheckIn.mutate({ request_id: id, kind: "safe" })}
                className="mt-2 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground"
              >
                Mark safe
              </button>
            )}
          </div>
        )}

        <section className="space-y-2 rounded-md border border-input bg-card p-3 text-sm">
          <Row label="From" value={aliasMap[req.requester_id] ?? "—"} />
          <Row label="Urgency" value={req.urgency} />
          <Row
            label="Location"
            value={
              canSeeExact && req.lat_exact != null
                ? `${req.lat_exact.toFixed(5)}, ${req.lng_exact!.toFixed(5)}${req.area_label ? ` · ${req.area_label}` : ""}`
                : req.area_label ??
                  (req.lat_coarse != null
                    ? `~${req.lat_coarse.toFixed(2)}, ${req.lng_coarse!.toFixed(2)}`
                    : "Area not shared")
            }
          />
          {req.notes && <Row label="Notes" value={req.notes} />}
          <Row label="Created" value={new Date(req.created_at).toLocaleString()} />
          <Row label="Expires" value={new Date(req.expires_at).toLocaleString()} />
        </section>

        {/* Pending volunteer proposals */}
        {isOwner && claims.filter((c) => c.status === "pending").map((c) => (
          <section key={c.id} className="space-y-2 rounded-md border border-warning bg-warning/10 p-3 text-sm">
            <div className="font-medium">Volunteer proposal</div>
            <Row label="Alias" value={aliasMap[c.volunteer_id] ?? "—"} />
            {c.meetup_type && <Row label="Method" value={c.meetup_type} />}
            {c.meetup_point && <Row label="Meetup" value={c.meetup_point} />}
            {c.note && <Row label="Note" value={c.note} />}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() =>
                  decide.mutate({ claim_id: c.id, request_id: req.id, decision: "declined" })
                }
                className="flex-1 rounded-md border border-input px-3 py-2"
              >Decline</button>
              <button
                onClick={() =>
                  decide.mutate({ claim_id: c.id, request_id: req.id, decision: "approved" })
                }
                className="flex-1 rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground"
              >Approve &amp; reveal exact location</button>
            </div>
          </section>
        ))}

        {/* If you're a volunteer with a pending claim */}
        {!isOwner && claims.some((c) => c.volunteer_id === user?.id && c.status === "pending") && (
          <p className="rounded-md border border-input bg-card p-3 text-xs text-muted-foreground">
            Waiting for requester to approve your proposal.
          </p>
        )}

        {approvedClaim && (
          <section className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
            <div className="font-medium">Matched</div>
            <Row label="Volunteer" value={aliasMap[approvedClaim.volunteer_id] ?? "—"} />
            {approvedClaim.meetup_type && <Row label="Method" value={approvedClaim.meetup_type} />}
            {approvedClaim.meetup_point && <Row label="Meetup" value={approvedClaim.meetup_point} />}
          </section>
        )}

        {/* Check-ins (for participants) */}
        {isParticipant && (
          <section className="space-y-2 rounded-md border border-input bg-card p-3 text-sm">
            <div className="font-medium">Check in</div>
            <div className="flex flex-wrap gap-2">
              {(["on_the_way", "arrived", "delayed", "safe"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => sendCheckIn.mutate({ request_id: id, kind: k })}
                  disabled={sendCheckIn.isPending}
                  className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                >
                  {k.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customCheckIn}
                onChange={(e) => setCustomCheckIn(e.target.value)}
                placeholder="Custom note…"
                maxLength={200}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customCheckIn.trim()) {
                    sendCheckIn.mutate({ request_id: id, kind: "custom", note: customCheckIn.trim() });
                    setCustomCheckIn("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!customCheckIn.trim()) return;
                  sendCheckIn.mutate({ request_id: id, kind: "custom", note: customCheckIn.trim() });
                  setCustomCheckIn("");
                }}
                disabled={sendCheckIn.isPending || !customCheckIn.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >Send</button>
            </div>
          </section>
        )}

        {/* Check-in history */}
        {checkIns.length > 0 && (
          <section className="space-y-1 rounded-md border border-input bg-card p-3 text-xs">
            <div className="mb-1 font-medium text-sm">History</div>
            {checkIns.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {c.kind.replace("_", " ")}
                </span>
                <span className="text-muted-foreground">{aliasMap[c.sender_id] ?? "—"}</span>
                {c.note && <span className="text-foreground">“{c.note}”</span>}
                <span className="ml-auto text-muted-foreground">
                  {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Messages (for participants) */}
        {isParticipant && (
          <section className="rounded-md border border-input bg-card p-3">
            <div className="mb-2 text-sm font-medium">Messages</div>
            <div className="max-h-48 overflow-y-auto space-y-2 rounded-md bg-muted/30 p-2 text-xs">
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground">No messages yet.</p>
              )}
              {messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <div className="mb-0.5 text-[10px] opacity-70">{aliasMap[m.sender_id] ?? "—"}</div>
                      {isE2EEEnvelope(m.ciphertext) ? (
                        <DecryptedMessage
                          ciphertext={m.ciphertext}
                          myUserId={user?.id}
                          peerPubKey={peerPubKey ?? null}
                        />
                      ) : (
                        m.ciphertext
                      )}
                      <div className="mt-0.5 text-right text-[10px] opacity-60">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={msgEndRef} />

            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Type a message…"
                maxLength={500}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && msgText.trim()) {
                    sendMsg();
                  }
                }}
              />
              <button
                onClick={sendMsg}
                disabled={sendMessage.isPending || !msgText.trim()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >Send</button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {/* TODO: replace with true E2EE — currently stored as plaintext protected by RLS */}
              Protected by access control. End-to-end encryption coming soon.
            </p>
          </section>
        )}

        {isOwner && !["completed", "cancelled", "expired"].includes(req.status) && (
          <div className="flex gap-2">
            <button
              onClick={() => update.mutate({ id: req.id, patch: { status: "cancelled" } })}
              className="flex-1 rounded-md border border-input px-4 py-3"
            >Cancel</button>
            {req.status === "claimed" && (
              <button
                onClick={() => update.mutate({ id: req.id, patch: { status: "completed" } })}
                className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
              >Mark complete</button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );

  function sendMsg() {
    if (!msgText.trim()) return;
    // For now, store plaintext with a wrapper to indicate encryption is planned
    // In a future phase, this will be encrypted client-side before sending
    sendMessage.mutate({ request_id: id, ciphertext: msgText.trim() });
    setMsgText("");
  }
}

function EncryptedMessage({ ciphertext }: { ciphertext: string }) {
  // Placeholder for future E2EE decryption
  return <span className="italic opacity-60">[encrypted]</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-warning/20 text-warning-foreground",
    pending_approval: "bg-warning/30 text-warning-foreground",
    claimed: "bg-accent/20 text-accent-foreground",
    completed: "bg-success/20 text-success-foreground",
    cancelled: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs ${map[status] ?? "bg-muted"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
