foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    If ($args[0]) {
        $cmd = '$env:' + $args[0] + '="' + $args[1] + '"'
        Invoke-Expression $cmd
    }
}

cd $PSScriptRoot\..\back
.\.venv\Scripts\activate
python manage.py migrate
fme $env:FMEDIR\01_import_fake_data.fmw
fme $env:FMEDIR\02_product_metadata.fmw
$env:PGPASSWORD = $env:PGPOSTGRESPASSWORD
pg_dump -U postgres -F c -b -v -f $PSScriptRoot'\'$env:PGDATABASE'.backup' $env:PGDATABASE
