-- App: eigene eingelöste Mastercode-Zeile lesen (Fallback neben viewerMasterRedemption aus der Edge Function).
create policy "Master codes read own redemption row"
on public.master_codes
for select
using (
  redeemed_by is not null
  and redeemed_at is not null
  and auth.uid() = redeemed_by
);
