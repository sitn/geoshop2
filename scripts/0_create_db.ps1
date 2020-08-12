# Read .env
foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$geoshop_password = $env:PGPASSWORD
$env:PGPASSWORD = $env:PGPOSTGRESPASSWORD
# Sometimes, terminate_backend needs to be called two time in a row to turn off all connexions.
psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$env:PGDATABASE';"
psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$env:PGDATABASE';"
psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS $env:PGDATABASE;"
psql -U postgres -d postgres -c "CREATE DATABASE $env:PGDATABASE OWNER $env:PGUSER;"
psql -U postgres -d $env:PGDATABASE -c "CREATE EXTENSION postgis;"
$env:PGPASSWORD = $geoshop_password
psql -U $env:PGUSER -d $env:PGDATABASE -c "CREATE SCHEMA $env:PGSCHEMA;"
