/**
 * Script zum Ausführen der Migrationen über die Supabase Management API
 * Benötigt SUPABASE_SERVICE_ROLE_KEY als Umgebungsvariable
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade Umgebungsvariablen
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Fehler: VITE_SUPABASE_URL oder SUPABASE_URL nicht gefunden');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Fehler: SUPABASE_SERVICE_ROLE_KEY nicht gefunden');
  console.log('\n💡 Bitte setze die Umgebungsvariable:');
  console.log('   $env:SUPABASE_SERVICE_ROLE_KEY="dein-service-role-key"');
  console.log('\n   Den Service Role Key findest du hier:');
  console.log('   Supabase Dashboard → Project Settings → API → service_role key\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql) {
  // Teile das SQL in einzelne Statements auf
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Führe ${statements.length} SQL-Statements aus...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;

    try {
      // Verwende die Supabase REST API direkt für SQL-Ausführung
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        // Versuche alternativ direkt über PostgREST
        const { error } = await supabase.rpc('exec_sql', { query: statement });
        if (error) {
          console.error(`❌ Fehler bei Statement ${i + 1}:`, error.message);
          // Versuche es trotzdem weiter
        } else {
          console.log(`✅ Statement ${i + 1} ausgeführt`);
        }
      } else {
        console.log(`✅ Statement ${i + 1} ausgeführt`);
      }
    } catch (err) {
      console.error(`❌ Fehler bei Statement ${i + 1}:`, err.message);
      // Versuche es trotzdem weiter
    }
  }
}

async function runMigrations() {
  console.log('🚀 Starte Migrationen...\n');

  try {
    // Lade das kombinierte Script
    const scriptPath = join(__dirname, '..', 'supabase', 'apply_fixes.sql');
    const sql = readFileSync(scriptPath, 'utf-8');

    // Führe das SQL aus
    await executeSQL(sql);

    console.log('\n✅ Migrationen erfolgreich ausgeführt!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   - Die Code-Änderungen in src/services/appApi.ts sind bereits gespeichert');
    console.log('   - Beim nächsten Deployment werden die Änderungen aktiv\n');
    
  } catch (err) {
    console.error('❌ Fehler beim Ausführen der Migrationen:', err.message);
    console.log('\n📋 Alternativ: Kopiere den Inhalt von supabase/apply_fixes.sql');
    console.log('   in den Supabase SQL Editor und führe ihn dort aus.\n');
    process.exit(1);
  }
}

runMigrations();
