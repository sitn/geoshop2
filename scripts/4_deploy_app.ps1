. "$PSScriptRoot\replace-with-env.ps1"
$destConfig = Read-Host -Prompt 'Input "prod" or "prepub"'
$envFile = ("{0}\..\back\.env.{1}" -f $PSScriptRoot, $destConfig)
# Read .env
foreach ($line in Get-Content $envFile) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$env:API_URL = ("{0}{1}" -f $env:DOCUMENT_BASE_URL, $env:ROOTURL)
$env:MEDIA_URL = ("{0}{1}_media/images" -f $env:DOCUMENT_BASE_URL, $env:FRONT_HREF)
if ($destConfig -eq "prod") {
    $env:GEOSHOP_DATA = "/mnt/geoshop_data"
} else {
    $env:GEOSHOP_DATA = "/mnt/geoshop_data_prepub"
}

$env:ENV_FILE = (".env.{0}" -f $destConfig)
$env:COMPOSE_PROJECT_NAME = ("geoshop2_{0}" -f $destConfig)

Replace-With-Env -InFile "$PSScriptRoot\..\front\src\assets\configs\config.json.tmpl" -OutFile "$PSScriptRoot\..\front\src\assets\configs\config.json"
Replace-With-Env -InFile "$PSScriptRoot\..\front\httpd.conf.tmpl" -OutFile "$PSScriptRoot\..\front\httpd.conf"

Write-Output ("{0} - DOCKER_HOST IS {1}" -f $(Get-Date -Format g), $env:DOCKER_HOST)

docker-compose build api
docker-compose build front
docker-compose down
docker-compose up -d

Write-Output ("{0} - END" -f $(Get-Date -Format g))
