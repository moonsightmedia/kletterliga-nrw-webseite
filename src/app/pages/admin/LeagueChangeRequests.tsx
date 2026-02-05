import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { listChangeRequests, updateChangeRequest, updateProfile, fetchProfile } from "@/services/appApi";
import type { ChangeRequest, Profile } from "@/services/appTypes";
import { AlertCircle, CheckCircle2, XCircle, Clock, User, Mail, Calendar } from "lucide-react";

type ChangeRequestWithProfile = ChangeRequest & {
  profile?: Profile;
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "open":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Offen</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Genehmigt</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Abgelehnt</Badge>;
    default:
      return <Badge variant="outline">{status || "Unbekannt"}</Badge>;
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
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestWithProfile | null>(null);
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

    // Lade Profile für alle Requests
    const requestsWithProfiles = await Promise.all(
      (data ?? []).map(async (request) => {
        const { data: profile } = await fetchProfile(request.profile_id);
        return { ...request, profile };
      })
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
      // Aktualisiere das Profil mit den gewünschten Werten
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

      // Aktualisiere den Request-Status
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
      setSelectedRequest(null);
    } catch (error) {
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
      setSelectedRequest(null);
    } catch (error) {
      toast({ title: "Fehler", description: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-headline text-3xl text-primary">Änderungsanfragen</h1>
          <p className="text-sm text-muted-foreground mt-2">Verwaltung von Wertungsklassen-Änderungen.</p>
        </div>
        <div className="text-sm text-muted-foreground">Lade Anfragen...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Änderungsanfragen</h1>
        <p className="text-sm text-muted-foreground mt-2">Verwaltung von Wertungsklassen-Änderungen.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="open">
            Offen ({requests.filter((r) => r.status === "open").length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Genehmigt ({requests.filter((r) => r.status === "approved").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Abgelehnt ({requests.filter((r) => r.status === "rejected").length})
          </TabsTrigger>
          <TabsTrigger value="all">Alle ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Keine Anfragen gefunden.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="p-5 md:p-6 border-border/60">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-semibold text-primary">
                            {request.profile?.first_name} {request.profile?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {request.email || request.profile?.email || "-"}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-widest text-secondary">Aktuell</div>
                      <div className="text-sm">
                        <div>Liga: <span className="font-semibold">{getLeagueLabel(request.current_league)}</span></div>
                        <div>Geschlecht: <span className="font-semibold">{getGenderLabel(request.current_gender)}</span></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-widest text-secondary">Gewünscht</div>
                      <div className="text-sm">
                        <div>Liga: <span className="font-semibold text-primary">{getLeagueLabel(request.requested_league)}</span></div>
                        <div>Geschlecht: <span className="font-semibold text-primary">{getGenderLabel(request.requested_gender)}</span></div>
                      </div>
                    </div>
                  </div>

                  {request.message && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs uppercase tracking-widest text-secondary mb-1">Nachricht</div>
                      <div className="text-sm text-muted-foreground">{request.message}</div>
                    </div>
                  )}

                  {request.status === "open" && (
                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(request)}
                        disabled={processing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Genehmigen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(request)}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Ablehnen
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeagueChangeRequests;
