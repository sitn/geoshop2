. "$PSScriptRoot\replace-with-env.ps1"
# Read .env
foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

# Backend

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

# Frontend

cd "$PSScriptRoot\..\front"
npm install
run ng build -- --prod --base-href $env:FRONT_HREF
$htaccess_sample = "$PSScriptRoot\..\apache\htaccess.sample"
$htaccess_out = "$PSScriptRoot\..\front\dist\.htaccess"
Replace-With-Env -InFile $htaccess_sample -OutFile $htaccess_out

$conf_sample = "$PSScriptRoot\..\apache\app.conf.sample"
$conf_out = "$PSScriptRoot\..\apache\app.conf"
Replace-With-Env -InFile $conf_sample -OutFile $conf_out
