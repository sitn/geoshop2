$pwd = pwd
# Read .env
$ok = Read-Host -Prompt 'Did you manually ran "\\necarto2\e$\SITN\Projets\Geoshop\02_realisation\10_prod_changes.fmw"? y | n'

foreach ($line in Get-Content $PSScriptRoot\..\back\.env.prod) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$prodBackup = ("\\nesitn1\e$\backup_postgresql\{0}_geoshop2.backup"-f $(Get-Date -Format "yyyyMMdd-HHmm"))
$tempBackup = "C:\Temp\geoshop_prepub.backup"

if ($ok -eq 'y') {
    # Database
    $env:PGPASSWORD = $env:PGPOSTGRESPASSWORD
    pg_dump -U postgres -F c -b -v --schema=$env:PGSCHEMA -f $prodBackup $env:PGDATABASE
    psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$env:PGDATABASE';"
    psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$env:PGDATABASE';"
    psql -U postgres -d postgres -c "DROP SCHEMA IF EXISTS old_$env:PGSCHEMA;"
    psql -U postgres -d postgres -c "ALTER SCHEMA $env:PGSCHEMA RENAME TO old_$env:PGSCHEMA;"
    psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'geoshop2_prepub';"
    psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'geoshop2_prepub';"
    pg_dump -U postgres -F c -b -v --schema=$env:PGSCHEMA -f $tempBackup geoshop2_prepub
    pg_restore -U postgres -F c -d $env:PGDATABASE $dumpFile
}

cd $pwd
