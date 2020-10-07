. "$PSScriptRoot\replace-with-env.ps1"
# Read .env
foreach ($line in Get-Content $PSScriptRoot\..\back\.env.prod) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$today = Get-Date
$todayString = $today.ToString('yyyy.MM.dd-hh:mm')

$env:API_URL = "https://sitn.ne.ch/geoshop2_api/"
$env:ENV_FILE = ".env.prod"

Replace-With-Env -InFile "$PSScriptRoot\..\front\src\assets\configs\config.json.tmpl" -OutFile "$PSScriptRoot\..\front\src\assets\configs\config.json"
Replace-With-Env -InFile "$PSScriptRoot\..\front\httpd.conf.tmpl" -OutFile "$PSScriptRoot\..\front\httpd.conf"

Write-Output ("{0} - DOCKER_HOST IS {1}" -f $todayString, $env:DOCKER_HOST)

docker-compose build api
docker-compose build front
docker-compose down
docker-compose up -d

Write-Output ("{0} - END" -f $todayString)
