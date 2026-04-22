const qualificationNoticeItems = [
  "Neu 2026",
  "Alle Hallen sind im gesamten Qualifikationszeitraum geöffnet",
  "Keine Etappen-Freigabe pro Halle",
];

const QualificationNoticeSequence = ({ suffix }: { suffix: string }) => (
  <div className="sponsor-marquee-sequence" aria-hidden="true">
    {qualificationNoticeItems.map((item, index) => (
      <span
        key={`${suffix}-${item}-${index}`}
        className="flex flex-shrink-0 items-center gap-3 pl-4 pr-1 text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
      >
        <span className="h-1.5 w-1.5 flex-shrink-0 bg-accent -skew-x-6" />
        <span className={index === 0 ? "font-headline text-accent" : "font-semibold"}>{item}</span>
      </span>
    ))}
  </div>
);

export const QualificationNoticeBanner = () => {
  return (
    <div className="border-y border-primary/20 bg-secondary py-2">
      <div className="overflow-hidden">
        <div className="sponsor-marquee-track !h-auto">
          <QualificationNoticeSequence suffix="a" />
          <QualificationNoticeSequence suffix="b" />
        </div>
      </div>
    </div>
  );
};
