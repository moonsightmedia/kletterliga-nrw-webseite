import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { MapPin, ExternalLink } from "lucide-react";
import { gyms } from "@/data/gyms";
import { usePageMeta } from "@/hooks/usePageMeta";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const Hallen = () => {
  usePageMeta({
    title: "Teilnehmende Hallen",
    description:
      "Alle Kletterhallen, in denen du Punkte für die Kletterliga NRW sammeln kannst.",
    canonicalPath: "/hallen",
  });

  const marker = L.icon({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const bounds = gyms.map((gym) => [gym.lat, gym.lng] as [number, number]);

  return (
    <PageLayout>
      <PageHeader 
        title="TEILNEHMENDE HALLEN" 
        subtitle="Alle Kletterhallen, in denen du Punkte für die Liga sammeln kannst."
      />

      {/* Map Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              HALLEN IN NRW
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {gyms.length} Hallen in ganz Nordrhein-Westfalen nehmen teil
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={50}>
            <div className="mb-10 overflow-hidden rounded-lg border border-border/60 bg-muted/30">
              <MapContainer
                bounds={bounds}
                boundsOptions={{ padding: [40, 40] }}
                className="h-80 w-full"
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {gyms.map((gym) => (
                  <Marker key={gym.name} position={[gym.lat, gym.lng]} icon={marker}>
                    <Popup>
                      <strong>{gym.name}</strong>
                      <br />
                      {gym.address}
                      <br />
                      <a href={gym.website} target="_blank" rel="noopener noreferrer">
                        Website besuchen
                      </a>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <div className="px-4 py-3 text-xs text-muted-foreground">
                Interaktive Karte mit allen teilnehmenden Hallen.
              </div>
            </div>
          </AnimatedSection>

          {/* Gyms Grid */}
          <StaggeredAnimation 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            staggerDelay={100}
            animation="fade-up"
          >
            {gyms.map((gym) => (
              <div 
                key={gym.name}
                className="card-kl group flex gap-6"
              >
                {/* Logo Placeholder */}
                <div className="w-20 h-20 flex-shrink-0 -skew-x-6 bg-accent/50 flex items-center justify-center group-hover:bg-secondary transition-colors duration-300">
                  <span className="skew-x-6 font-headline text-2xl text-primary group-hover:text-secondary-foreground transition-colors duration-300">
                    {gym.shortName ?? gym.name.charAt(0)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-headline text-xl text-primary mb-1 truncate">
                    {gym.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                    <MapPin size={14} />
                    <span>{gym.address}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {gym.leagues.map((league) => (
                      <span 
                        key={league}
                        className="inline-block bg-accent text-accent-foreground text-xs px-2 py-1 -skew-x-6"
                      >
                        <span className="skew-x-6 inline-block">{league}</span>
                      </span>
                    ))}
                  </div>

                  <a 
                    href={gym.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-secondary hover:text-secondary/80 text-sm font-medium transition-colors"
                  >
                    Website besuchen
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </StaggeredAnimation>
        </div>
      </section>

      {/* Become Partner Section */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedSection animation="fade-up">
              <h2 className="font-headline text-3xl md:text-4xl text-primary mb-6">
                DEINE HALLE IST NOCH NICHT DABEI?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Wir freuen uns über weitere Partner-Hallen! Wenn deine Lieblingshalle 
                noch nicht teilnimmt, sprich sie gerne an oder kontaktiere uns direkt.
              </p>
              <a 
                href="mailto:hallen@kletterliga-nrw.de"
                className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-8 py-4 -skew-x-6 font-medium hover:bg-secondary/90 transition-colors"
              >
                <span className="skew-x-6">Halle anmelden →</span>
              </a>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Hallen;
