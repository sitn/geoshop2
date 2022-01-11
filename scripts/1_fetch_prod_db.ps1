$pwd = pwd
foreach ($line in Get-Content $PSScriptRoot\..\back\.env.prod) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$filename = ("geoshop.backup")
$dumpFile = ("{0}\{1}"-f $PSScriptRoot, $filename)

$previous_PGPASSWORD = $env:PGPASSWORD
$env:PGPASSWORD = $env:PGPOSTGRESPASSWORD

If (Test-Path $dumpFile) {
    Remove-Item $dumpFile
}

pg_dump -U postgres -F c -n $env:PGSCHEMA -b -f $dumpFile $env:PGDATABASE

If (Test-Path $dumpFile) {
    psql -U postgres -h localhost -d geoshop -c "DROP SCHEMA IF EXISTS old_$env:PGSCHEMA CASCADE;"
    psql -U postgres -h localhost -d geoshop -c "ALTER SCHEMA $env:PGSCHEMA RENAME TO old_$env:PGSCHEMA;"
    pg_restore -U postgres -h localhost -F c -d geoshop $dumpFile
} Else {
    Write-Host "$(Get-Date -Format g) pg_restore has not been done"
}
$env:PGPASSWORD = $previous_PGPASSWORD

Write-Host "$(Get-Date -Format g) variables d'environnement remises sur .env.local"

foreach ($line in Get-Content $PSScriptRoot\..\back\.env.local) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

Write-Host "$(Get-Date -Format g) terminé."

cd $pwd
