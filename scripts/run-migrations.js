/**
 * Script zum Ausführen der Supabase Migrationen
 * 
 * Verwendung:
 * 1. Setze SUPABASE_SERVICE_ROLE_KEY in .env.local oder als Umgebungsvariable
 * 2. Führe aus: node scripts/run-migrations.js
 * 
 * ODER: Kopiere den Inhalt von supabase/apply_fixes.sql in den Supabase SQL Editor
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
  console.log('💡 Tipp: Setze die Variable in .env.local oder als Umgebungsvariable');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Fehler: SUPABASE_SERVICE_ROLE_KEY nicht gefunden');
  console.log('💡 Tipp: Hole den Service Role Key aus dem Supabase Dashboard:');
  console.log('   Project Settings → API → service_role key');
  console.log('   Setze ihn als Umgebungsvariable: export SUPABASE_SERVICE_ROLE_KEY="..."');
  console.log('');
  console.log('📋 Alternativ: Kopiere den Inhalt von supabase/apply_fixes.sql');
  console.log('   in den Supabase SQL Editor und führe ihn dort aus.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigrations() {
  console.log('🚀 Starte Migrationen...\n');

  try {
    // Lade das kombinierte Script
    const scriptPath = join(__dirname, '..', 'supabase', 'apply_fixes.sql');
    const sql = readFileSync(scriptPath, 'utf-8');

    console.log('📝 Führe SQL-Script aus...');
    
    // Führe das SQL-Script aus
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Fallback: Versuche direkt über REST API
      console.log('⚠️  RPC-Methode nicht verfügbar, versuche direkten SQL-Zugriff...');
      
      // Für direkten SQL-Zugriff müssen wir die Supabase Management API verwenden
      // Das ist komplizierter, daher zeigen wir eine bessere Alternative
      console.log('\n❌ Direkter SQL-Zugriff über JS Client nicht möglich.');
      console.log('\n📋 Bitte führe das Script manuell aus:');
      console.log('   1. Öffne dein Supabase Dashboard');
      console.log('   2. Gehe zu "SQL Editor"');
      console.log('   3. Öffne die Datei: supabase/apply_fixes.sql');
      console.log('   4. Kopiere den gesamten Inhalt');
      console.log('   5. Füge ihn in den SQL Editor ein');
      console.log('   6. Klicke auf "Run"\n');
      process.exit(1);
    }

    console.log('✅ Migrationen erfolgreich ausgeführt!');
    console.log('📊 Ergebnis:', data);
    
  } catch (err) {
    console.error('❌ Fehler beim Ausführen der Migrationen:', err.message);
    console.log('\n📋 Bitte führe das Script manuell aus:');
    console.log('   1. Öffne dein Supabase Dashboard');
    console.log('   2. Gehe zu "SQL Editor"');
    console.log('   3. Öffne die Datei: supabase/apply_fixes.sql');
    console.log('   4. Kopiere den gesamten Inhalt');
    console.log('   5. Füge ihn in den SQL Editor ein');
    console.log('   6. Klicke auf "Run"\n');
    process.exit(1);
  }
}

runMigrations();
