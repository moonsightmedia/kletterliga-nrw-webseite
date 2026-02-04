// Script zum Erstellen von Test-Teilnehmern
// Verwendet die Supabase Management API
// Führe aus mit: node scripts/create-test-participants.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY; // Benötigt Service Role Key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Fehler: VITE_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in .env.local gesetzt sein');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testParticipants = [
  { email: 'max.mustermann@example.com', first_name: 'Max', last_name: 'Mustermann', birth_date: '2005-03-15', gender: 'm', league: 'toprope', role: 'participant' },
  { email: 'sarah.schmidt@example.com', first_name: 'Sarah', last_name: 'Schmidt', birth_date: '2007-08-22', gender: 'w', league: 'toprope', role: 'participant' },
  { email: 'tom.weber@example.com', first_name: 'Tom', last_name: 'Weber', birth_date: '2004-11-10', gender: 'm', league: 'lead', role: 'participant' },
  { email: 'lisa.mueller@example.com', first_name: 'Lisa', last_name: 'Müller', birth_date: '2006-05-18', gender: 'w', league: 'lead', role: 'participant' },
  { email: 'felix.bauer@example.com', first_name: 'Felix', last_name: 'Bauer', birth_date: '2003-12-03', gender: 'm', league: 'toprope', role: 'participant' },
  { email: 'emma.fischer@example.com', first_name: 'Emma', last_name: 'Fischer', birth_date: '2008-01-25', gender: 'w', league: 'toprope', role: 'participant' },
  { email: 'noah.klein@example.com', first_name: 'Noah', last_name: 'Klein', birth_date: '2005-07-14', gender: 'm', league: 'lead', role: 'participant' },
  { email: 'sophia.hoffmann@example.com', first_name: 'Sophia', last_name: 'Hoffmann', birth_date: '2004-09-30', gender: 'w', league: 'lead', role: 'participant' },
  { email: 'lukas.wagner@example.com', first_name: 'Lukas', last_name: 'Wagner', birth_date: '2006-02-12', gender: 'm', league: 'toprope', role: 'participant' },
  { email: 'mia.becker@example.com', first_name: 'Mia', last_name: 'Becker', birth_date: '2007-06-08', gender: 'w', league: 'toprope', role: 'participant' },
];

async function createTestParticipants() {
  console.log('Erstelle Test-Teilnehmer...\n');
  
  for (const participant of testParticipants) {
    try {
      // Erstelle Auth-Benutzer
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: participant.email,
        password: 'test123',
        email_confirm: true,
        user_metadata: {
          role: participant.role
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  ${participant.email} existiert bereits, überspringe...`);
          continue;
        }
        console.error(`❌ Fehler beim Erstellen von ${participant.email}:`, authError.message);
        continue;
      }

      if (!authData.user) {
        console.error(`❌ Kein User-Daten für ${participant.email}`);
        continue;
      }

      // Erstelle Profil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: participant.email,
          first_name: participant.first_name,
          last_name: participant.last_name,
          birth_date: participant.birth_date,
          gender: participant.gender,
          league: participant.league,
          role: participant.role,
        });

      if (profileError) {
        console.error(`❌ Fehler beim Erstellen des Profils für ${participant.email}:`, profileError.message);
      } else {
        console.log(`✅ ${participant.first_name} ${participant.last_name} (${participant.email}) erstellt`);
      }
    } catch (error) {
      console.error(`❌ Unerwarteter Fehler für ${participant.email}:`, error.message);
    }
  }

  console.log('\n✅ Fertig!');
}

createTestParticipants();
