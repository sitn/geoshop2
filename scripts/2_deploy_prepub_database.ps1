$pwd = pwd
# Read .env
foreach ($line in Get-Content $PSScriptRoot\..\back\.env.prepub) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$filename = ("geoshop.backup")
$dumpFile = ("{0}\{1}"-f $PSScriptRoot, $filename)

Remove-Item -Recurse -Force "\\$env:PGHOST\geoshop_data_prepub\extract\*"
Copy-Item -Recurse $PSScriptRoot\..\back\files\extract\* -Destination "\\$env:PGHOST\geoshop_data_prepub\extract\"

# Database
If (Test-Path $dumpFile) {
    $geoshop_password = $env:PGPASSWORD
    $env:PGPASSWORD = $env:PGPOSTGRESPASSWORD
    # pg_dump -U postgres -F c -b -v --schema=$env:PGSCHEMA -f $dumpFile $env:PGDATABASE
    psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$env:PGDATABASE';"
    psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$env:PGDATABASE';"
    psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS $env:PGDATABASE;"
    psql -U postgres -d postgres -c "CREATE DATABASE $env:PGDATABASE OWNER $env:PGUSER;"
    psql -U postgres -d $env:PGDATABASE -c "CREATE EXTENSION postgis;"
    pg_restore -U postgres -F c -d $env:PGDATABASE $dumpFile
    fme $env:FMEDIR\10_prod_changes.fmw
    $env:PGPASSWORD = $geoshop_password
    psql -U $env:PGUSER -d $env:PGDATABASE -f $PSScriptRoot\triggers.sql
} Else {
    Write-Host "$(Get-Date -Format g) pg_restore has not been done"
}

cd $pwd
