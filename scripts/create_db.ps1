foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    $cmd = '$env:' + $args[0] + '="' + $args[1] + '"'
    Invoke-Expression $cmd
}

$geoshop_password = $env:PGPASSWORD
$env:PGPASSWORD = $env:PGPOSTGRESPASSWORD
psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS $env:PGDATABASE;"
psql -U postgres -d postgres -c "CREATE DATABASE $env:PGDATABASE OWNER $env:PGUSER;"
psql -U postgres -d $env:PGDATABASE -c "CREATE EXTENSION postgis;"
$env:PGPASSWORD = $geoshop_password
psql -U $env:PGUSER -d $env:PGDATABASE -c "CREATE SCHEMA $env:PGSCHEMA;"
