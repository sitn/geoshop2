# Read .env
$pwd = pwd
foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$filename = ("{0}.backup" -f $env:PGDATABASE)
$dumpFile = ("{0}\{1}"-f $PSScriptRoot, $filename)

cd $PSScriptRoot\..\back
.\.venv\Scripts\activate
python manage.py migrate

fme $env:FMEDIR\01_import_real_data.fmw
& "$PSScriptRoot\reset_sequences.ps1"
fme $env:FMEDIR\02_real_product_metadata_pricing.fmw
$destFolder = $env:PREPUB_SERVER_PATH
$destFile = ("{0}\{1}" -f $env:PREPUB_SERVER_PATH, $filename)

fme $env:FMEDIR\03_order_item.fmw
fme $env:FMEDIR\05_mo2geoshop.fmw

& "$PSScriptRoot\reset_sequences.ps1"
Remove-Item $PSScriptRoot\..\back\files\extract\* -Recurse -Force
python manage.py fixturize
python manage.py prepareusertests

$previous_PGPASSWORD = $env:PGPASSWORD
$env:PGPASSWORD = $env:PGPOSTGRESPASSWORD

If (Test-Path $dumpFile) {
    Remove-Item $dumpFile
}
pg_dump -U postgres -F c -b -v -f $dumpFile $env:PGDATABASE
If (Test-Path $destFile) {
    Remove-Item $destFile
}
xcopy $dumpFile $destFolder
$env:PGPASSWORD = $previous_PGPASSWORD

$errorlogs = Get-ChildItem -Recurse -Path $env:FMEDIR\*.log | Select-String "ERROR" -List

If ($errorlogs) {
    Write-Error "$errorlogs"
}

cd $pwd
