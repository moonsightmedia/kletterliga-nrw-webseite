import { Link } from "react-router-dom";
import { Lock, CalendarDays, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUnlockDate } from "@/config/launch";

type Props = {
  title?: string;
  description?: string;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

const FeatureLocked = ({
  title = "Bereich noch nicht freigeschaltet",
  description = "Dieser Bereich wird zum Saisonstart freigeschaltet.",
}: Props) => {
  const unlock = getUnlockDate();

  return (
    <Card className="p-6 md:p-8 border-border/60">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-accent/70 flex items-center justify-center">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-3">
          <h2 className="font-headline text-2xl text-primary">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
          <div className="inline-flex items-center gap-2 text-sm bg-background border border-border px-3 py-2 -skew-x-6">
            <CalendarDays className="h-4 w-4 skew-x-6" />
            <span className="skew-x-6 inline-block">Freischaltung am {formatDate(unlock)}</span>
          </div>
          <div>
            <Button asChild>
              <Link to="/app">
                <span className="skew-x-6 inline-flex items-center gap-2">
                  Zum Dashboard
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FeatureLocked;
