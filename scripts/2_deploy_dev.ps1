foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0] + '="' + $args[1] + '"'
        Invoke-Expression $cmd
    }
}

cd $PSScriptRoot\..\back
pipenv install
.\.venv\Scripts\activate
pipenv run python manage.py collectstatic --noinput
pipenv run python manage.py compilemessages
pipenv run python manage.py setcustompassword

If (Test-Path $PSScriptRoot\$env:PGDATABASE'.backup') {
    $env:PGPASSWORD = $env:PGPOSTGRESPASSWORD
    pg_restore -C -U postgres -F c -d $env:PGDATABASE $PSScriptRoot'\'$env:PGDATABASE'.backup'
} Else {
    Write-Host "pg_dump has not been done"
}
