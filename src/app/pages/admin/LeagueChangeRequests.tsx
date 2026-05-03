import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { listChangeRequests, updateChangeRequest, updateProfile, fetchProfile } from "@/services/appApi";
import type { ChangeRequest, Profile } from "@/services/appTypes";
import { AlertCircle, CheckCircle2, XCircle, Clock, User, Mail, Calendar } from "lucide-react";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";

type ChangeRequestWithProfile = ChangeRequest & {
  profile?: Profile;
};

const badgeRow = "inline-flex items-center gap-1 normal-case tracking-normal";

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "open":
      return (
        <StitchBadge tone="ghost" className={`${badgeRow} border-amber-200 bg-amber-50 text-amber-800`}>
          <Clock className="h-3 w-3" />
          Offen
        </StitchBadge>
      );
    case "approved":
      return (
        <StitchBadge tone="ghost" className={`${badgeRow} border-emerald-200 bg-emerald-50 text-emerald-800`}>
          <CheckCircle2 className="h-3 w-3" />
          Genehmigt
        </StitchBadge>
      );
    case "rejected":
      return (
        <StitchBadge tone="ghost" className={`${badgeRow} border-red-200 bg-red-50 text-red-800`}>
          <XCircle className="h-3 w-3" />
          Abgelehnt
        </StitchBadge>
      );
    default:
      return (
        <StitchBadge tone="ghost" className={badgeRow}>
          {status || "Unbekannt"}
        </StitchBadge>
      );
  }
};

const getLeagueLabel = (league: string | null) => {
  switch (league) {
    case "toprope":
      return "Toprope";
    case "lead":
      return "Vorstieg";
    default:
      return league || "-";
  }
};

const getGenderLabel = (gender: string | null) => {
  switch (gender) {
    case "m":
      return "Männlich";
    case "w":
      return "Weiblich";
    default:
      return gender || "-";
  }
};

const LeagueChangeRequests = () => {
  const [requests, setRequests] = useState<ChangeRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "open" | "approved" | "rejected">("open");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await listChangeRequests();
    if (error) {
      toast({ title: "Fehler", description: error.message });
      setLoading(false);
      return;
    }

    const requestsWithProfiles = await Promise.all(
      (data ?? []).map(async (request) => {
        const { data: profile } = await fetchProfile(request.profile_id);
        return { ...request, profile };
      }),
    );

    setRequests(requestsWithProfiles);
    setLoading(false);
  };

  const filteredRequests = useMemo(() => {
    if (activeTab === "all") return requests;
    return requests.filter((req) => req.status === activeTab);
  }, [requests, activeTab]);

  const handleApprove = async (request: ChangeRequestWithProfile) => {
    if (!request.profile_id) return;

    setProcessing(true);
    try {
      const updateData: Partial<Profile> = {};
      if (request.requested_league) {
        updateData.league = request.requested_league as "toprope" | "lead";
      }
      if (request.requested_gender) {
        updateData.gender = request.requested_gender as "m" | "w";
      }

      const { error: profileError } = await updateProfile(request.profile_id, updateData);
      if (profileError) {
        toast({ title: "Fehler", description: profileError.message || "Fehler beim Aktualisieren des Profils" });
        setProcessing(false);
        return;
      }

      const { error: requestError } = await updateChangeRequest(request.id, { status: "approved" });
      if (requestError) {
        toast({ title: "Fehler", description: requestError.message || "Fehler beim Aktualisieren der Anfrage" });
        setProcessing(false);
        return;
      }

      toast({
        title: "Anfrage genehmigt",
        description: "Das Profil wurde aktualisiert und der Teilnehmer wurde benachrichtigt.",
      });

      await loadRequests();
    } catch {
      toast({ title: "Fehler", description: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (request: ChangeRequestWithProfile) => {
    setProcessing(true);
    try {
      const { error } = await updateChangeRequest(request.id, { status: "rejected" });
      if (error) {
        toast({ title: "Fehler", description: error.message || "Fehler beim Ablehnen der Anfrage" });
        setProcessing(false);
        return;
      }

      toast({
        title: "Anfrage abgelehnt",
        description: "Der Teilnehmer wurde benachrichtigt.",
      });

      await loadRequests();
    } catch {
      toast({ title: "Fehler", description: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Liga"
          title="Änderungsanfragen"
          description="Verwaltung von Wertungsklassen-Änderungen."
        />
        <p className="text-sm text-[rgba(27,28,26,0.64)]">Lade Anfragen…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Liga"
        title="Änderungsanfragen"
        description="Verwaltung von Wertungsklassen-Änderungen."
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="open">Offen ({requests.filter((r) => r.status === "open").length})</TabsTrigger>
          <TabsTrigger value="approved">Genehmigt ({requests.filter((r) => r.status === "approved").length})</TabsTrigger>
          <TabsTrigger value="rejected">Abgelehnt ({requests.filter((r) => r.status === "rejected").length})</TabsTrigger>
          <TabsTrigger value="all">Alle ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredRequests.length === 0 ? (
            <StitchCard tone="muted" className="p-8 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[rgba(27,28,26,0.35)]" />
              <p className="text-sm text-[rgba(27,28,26,0.64)]">Keine Anfragen gefunden.</p>
            </StitchCard>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <StitchCard key={request.id} tone="surface" className="p-5 md:p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <User className="h-5 w-5 text-[rgba(27,28,26,0.45)]" />
                        <div>
                          <div className="font-semibold text-[#002637]">
                            {request.profile?.first_name} {request.profile?.last_name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[rgba(27,28,26,0.55)]">
                            <Mail className="h-3 w-3" />
                            {request.email || request.profile?.email || "-"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-[rgba(27,28,26,0.55)]">
                        <Calendar className="h-3 w-3" />
                        {new Date(request.created_at).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div>{getStatusBadge(request.status)}</div>
                  </div>

                  <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="stitch-kicker text-[#a15523]">Aktuell</div>
                      <div className="text-sm text-[#002637]">
                        <div>
                          Liga: <span className="font-semibold">{getLeagueLabel(request.current_league)}</span>
                        </div>
                        <div>
                          Geschlecht: <span className="font-semibold">{getGenderLabel(request.current_gender)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="stitch-kicker text-[#a15523]">Gewünscht</div>
                      <div className="text-sm text-[#002637]">
                        <div>
                          Liga: <span className="font-semibold text-[#003d55]">{getLeagueLabel(request.requested_league)}</span>
                        </div>
                        <div>
                          Geschlecht:{" "}
                          <span className="font-semibold text-[#003d55]">{getGenderLabel(request.requested_gender)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {request.message ? (
                    <div className="mb-4 rounded-lg bg-[rgba(0,61,85,0.06)] p-3">
                      <div className="stitch-kicker mb-1 text-[#a15523]">Nachricht</div>
                      <div className="text-sm text-[rgba(27,28,26,0.64)]">{request.message}</div>
                    </div>
                  ) : null}

                  {request.status === "open" ? (
                    <div className="flex gap-2 border-t border-[rgba(0,38,55,0.08)] pt-4">
                      <StitchButton type="button" size="sm" onClick={() => handleApprove(request)} disabled={processing}>
                        <CheckCircle2 className="h-4 w-4" />
                        Genehmigen
                      </StitchButton>
                      <StitchButton type="button" variant="outline" size="sm" onClick={() => handleReject(request)} disabled={processing}>
                        <XCircle className="h-4 w-4" />
                        Ablehnen
                      </StitchButton>
                    </div>
                  ) : null}
                </StitchCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeagueChangeRequests;
