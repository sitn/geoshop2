$pwd = pwd
foreach ($line in Get-Content $PSScriptRoot\..\..\back\.env.prepub) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$filename = ("geoshop_local.backup")
$dumpFile = ("{0}\{1}"-f $PSScriptRoot, $filename)

$previous_PGPASSWORD = $env:PGPASSWORD
$env:PGPASSWORD = $env:PGPOSTGRESPASSWORD

If (Test-Path $dumpFile) {
    Remove-Item $dumpFile
}

pg_dump -h localhost -U postgres -F c -n $env:PGSCHEMA -b -f $dumpFile geoshop

If (Test-Path $dumpFile) {
    psql -U postgres -c "DROP SCHEMA IF EXISTS old_$env:PGSCHEMA CASCADE;"
    psql -U postgres -c "ALTER SCHEMA $env:PGSCHEMA RENAME TO old_$env:PGSCHEMA;"
    pg_restore -U postgres -F c -d $env:PGDATABASE $dumpFile
} Else {
    Write-Host "$(Get-Date -Format g) pg_restore has not been done"
}
$env:PGPASSWORD = $previous_PGPASSWORD

cd $pwd
