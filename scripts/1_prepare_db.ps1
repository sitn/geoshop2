# Read .env
$pwd = pwd
foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}
$destConfig = Read-Host -Prompt 'Input "dev" or "prepub"'

$filename = ("{0}.backup" -f $env:PGDATABASE)
$dumpFile = ("{0}\{1}"-f $PSScriptRoot, $filename)

cd $PSScriptRoot\..\back
.\.venv\Scripts\activate
python manage.py migrate
If ($destConfig -eq "dev") {
    fme $env:FMEDIR\01_import_fake_data.fmw
    $destFolder = $env:DEV_SERVER_PATH
    $destFile = ("{0}\{1}" -f $env:DEV_SERVER_PATH, $filename)
} Else {
    fme $env:FMEDIR\01_import_real_data.fmw
    $destFolder = $env:PREPUB_SERVER_PATH
    $destFile = ("{0}\{1}" -f $env:PREPUB_SERVER_PATH, $filename)
}
fme $env:FMEDIR\02_product_metadata_pricing.fmw
fme $env:FMEDIR\03_order_item.fmw
fme $env:FMEDIR\05_mo2geoshop.fmw

If ($destConfig -eq "dev") {
    & "$PSScriptRoot\reset_sequences.ps1"
    python manage.py prepareusertests
}

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
cd $pwd
