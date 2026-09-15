param([Parameter(Mandatory=$true)][string]$SchemaSnapshot)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskPgBin=Join-Path $env:LOCALAPPDATA 'Kletterliga-QA\postgres-20260915\pgsql\bin'
$taskDb='kletterliga_semifinal_test_'+(Get-Date -Format 'yyyyMMddHHmmss')
# Deliberately no configurable remote host/URL. Only synthetic local tests.
$taskConnection=@('-h','127.0.0.1','-p','54329','-U','postgres')
& "$taskPgBin\createdb.exe" @taskConnection $taskDb
if($LASTEXITCODE -ne 0){throw 'Local test database creation failed'}
Push-Location $taskRoot
try {
  $taskSetup=& "$taskPgBin\psql.exe" @taskConnection -d $taskDb -X -q -v ON_ERROR_STOP=1 `
    -f supabase/tests/local_auth_bootstrap.sql -f $SchemaSnapshot `
    -f supabase/tests/local_auth_trigger.sql -f supabase/tests/migration_preservation_before.sql `
    -f supabase/migrations/20260914170000_close_qualification_and_guard_semifinal.sql `
    -c 'set client_min_messages=notice' -f supabase/tests/migration_preservation_after.sql 2>&1
  if($LASTEXITCODE -ne 0){$taskSetup | Select-Object -Last 12; throw 'Migration/preservation test failed'}
  # Fresh session: pg_dump restores with row_security=off and quiet notices.
  $taskTests=& "$taskPgBin\psql.exe" @taskConnection -d $taskDb -X -q -t -A -v ON_ERROR_STOP=1 `
    -f supabase/tests/post_qualification.sql -f supabase/tests/post_qualification_auth.sql 2>&1
  if($LASTEXITCODE -ne 0){$taskTests | Select-Object -Last 15; throw 'Role/Auth integration test failed'}
  $taskPasses=@($taskSetup+$taskTests | Where-Object {"$_" -match 'PASS:'} | ForEach-Object {"$_"})
  $taskReport=[ordered]@{
    database=$taskDb
    passed=$taskPasses.Count
    migration_sha256=(Get-FileHash 'supabase/migrations/20260914170000_close_qualification_and_guard_semifinal.sql').Hash
    schema_sha256=(Get-FileHash $SchemaSnapshot).Hash
    engine='PostgreSQL 17.11; actual live public schema, RLS, grants, functions and Auth confirmation trigger'
    limitation='Auth claim helper SQL mirrored; no complete GoTrue/PostgREST HTTP server in local test'
    tests=$taskPasses
  }
  [IO.File]::WriteAllText((Join-Path $taskRoot '.qa-post-qualification\database-test-report.json'),($taskReport | ConvertTo-Json -Depth 5))
  Write-Output ('PASS: '+$taskPasses.Count+' database assertions; '+$taskDb)
} finally {Pop-Location}
