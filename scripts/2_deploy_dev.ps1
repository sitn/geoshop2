. "$PSScriptRoot\replace-with-env.ps1"
$pwd = pwd
# Read .env
foreach ($line in Get-Content $PSScriptRoot\..\back\.env) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$buildConfig = Read-Host -Prompt 'Input "back", "front" or "full"'

# Backend
If ($buildConfig -eq "back" || $buildConfig -eq "full") {
    cd $PSScriptRoot\..\back
    $env:PIPENV_VENV_IN_PROJECT="True"
    pipenv install --skip-lock
    .\.venv\Scripts\activate
    pip install --disable-pip-version-check $env:GDAL_WHL
    pipenv run python manage.py collectstatic --noinput
    pipenv run python manage.py compilemessages
    pipenv run python manage.py setcustompassword

    If (Test-Path $PSScriptRoot\$env:PGDATABASE'.backup') {
        $env:PGPASSWORD = $env:PGPOSTGRESPASSWORD
        pg_restore -C -U postgres -F c -d $env:PGDATABASE $PSScriptRoot'\'$env:PGDATABASE'.backup'
    } Else {
        Write-Host "pg_dump has not been done"
    }
}

# Frontend
If ($buildConfig -eq "front" || $buildConfig -eq "full") {

    cd "$PSScriptRoot\..\front"
    npm install
    $href = $env:FRONT_HREF + '/'
    npm run ng build -- --prod --base-href $href
    $htaccess_sample = "$PSScriptRoot\..\apache\htaccess.sample"
    $htaccess_out = "$PSScriptRoot\..\front\dist\.htaccess"
    Replace-With-Env -InFile $htaccess_sample -OutFile $htaccess_out

    $conf_sample = "$PSScriptRoot\..\apache\app.conf.sample"
    $conf_out = "$PSScriptRoot\..\apache\app.conf"
    Replace-With-Env -InFile $conf_sample -OutFile $conf_out

    cd dist\assets\configs
    $path = "{0}://{1}{2}/" -f $env:FRONT_PROTOCOL, $env:FRONT_URL, $env:ROOTURL
    ((Get-Content -path ./config.json -Raw) -replace 'https://sitn.ne.ch/geoshop2_dev/',$path) | Set-Content -Path ./config.json
}
cd $pwd
