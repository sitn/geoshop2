$pwd = pwd
foreach ($line in Get-Content $PSScriptRoot\..\..\back\.env.prod) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

Write-Host "$(Get-Date -Format g) Starting backup..."

$filename = ("geoshop.backup")
$dumpFile = ("{0}\{1}"-f $PSScriptRoot, $filename)

If (Test-Path $dumpFile) {
    Remove-Item $dumpFile
}

pg_dump -U geoshop -F c -n $env:PGSCHEMA -b -f $dumpFile $env:PGDATABASE

Write-Host "$(Get-Date -Format g) PG dump done..."

Write-Host "$(Get-Date -Format g) variables d'environnement remises sur .env.local"

foreach ($line in Get-Content $PSScriptRoot\..\..\back\.env) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

If (Test-Path $dumpFile) {
    psql -U geoshop -h localhost -d geoshop -c "DROP SCHEMA IF EXISTS old_$env:PGSCHEMA CASCADE;"
    psql -U geoshop -h localhost -d geoshop -c "ALTER SCHEMA $env:PGSCHEMA RENAME TO old_$env:PGSCHEMA;"
    pg_restore -U geoshop -h localhost -F c -d geoshop $dumpFile
} Else {
    Write-Host "$(Get-Date -Format g) pg_restore has not been done"
}

Write-Host "$(Get-Date -Format g) terminé."

cd $pwd
