$pwd = pwd
# Read .env
foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$today = Get-Date
$todayString = $today.ToString('yyyyMMdd-hhmm')
$dumpFile = ("{0}\{1}_{2}.backup" -f "D:\postgres_backup", $todayString, $env:PGDATABASE)

# Database
If (Test-Path $PSScriptRoot\$env:PGDATABASE'.backup') {
    $env:PGPASSWORD = $env:PGPOSTGRESPASSWORD
    pg_dump -U postgres -F c -b -v --schema=$env:PGSCHEMA -f $dumpFile $env:PGDATABASE
    psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$env:PGDATABASE';"
    psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$env:PGDATABASE';"
    psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS $env:PGDATABASE;"
    psql -U postgres -d postgres -c "CREATE DATABASE $env:PGDATABASE OWNER $env:PGUSER;"
    psql -U postgres -d $env:PGDATABASE -c "CREATE EXTENSION postgis;"
    pg_restore -U postgres -F c -d $env:PGDATABASE $PSScriptRoot\$env:PGDATABASE'.backup'
} Else {
    Write-Host "pg_restore has not been done"
}

cd $pwd
