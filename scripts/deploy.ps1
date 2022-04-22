. "$PSScriptRoot\replace-with-env.ps1"
$destConfig = Read-Host -Prompt 'Input "prod", "prepub", "dev" or "local"'

# Do not deploy to internet with DEBUG set to True
$settings = Get-Content ("{0}\..\back\settings.py" -f $PSScriptRoot)
$isDebug = $settings | Select-String -Pattern "^\DEBUG = (True)$"
if ($isDebug.Matches.Success) {
    if ($destConfig -ne "local") {
        Write-Output "Cannot deploy if DEBUG=True in settings.py"
        Exit
    }
}
$envFile = ("{0}\..\back\.env.{1}" -f $PSScriptRoot, $destConfig)
# Read .env
foreach ($line in Get-Content $envFile) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '="' + $args[1].Trim('"') + '"'
        Invoke-Expression $cmd
    }
}

$env:API_URL = ("{0}{1}" -f $env:API_BASE_URL, $env:ROOTURL)
$env:MEDIA_URL = ("{0}/geoshop2_media" -f $env:API_BASE_URL, $env:FRONT_HREF)
if ($destConfig -eq "prod") {
    $env:GEOSHOP_DATA = "/mnt/geoshop_data"
} else {
    $env:GEOSHOP_DATA = "/mnt/geoshop_data_prepub"
}

$env:ENV_FILE = (".env.{0}" -f $destConfig)
Write-Output ("{0} - COMPOSE_PROJECT_NAME IS {1}" -f $(Get-Date -Format g), $env:COMPOSE_PROJECT_NAME)

Replace-With-Env -InFile "$PSScriptRoot\..\front\src\assets\configs\config.json.tmpl" -OutFile "$PSScriptRoot\..\front\src\assets\configs\config.json"
Replace-With-Env -InFile "$PSScriptRoot\..\front\httpd.conf.tmpl" -OutFile "$PSScriptRoot\..\front\httpd.conf"

Write-Output ("{0} - DOCKER_HOST IS {1}" -f $(Get-Date -Format g), $env:DOCKER_HOST)

docker-compose build api
docker-compose build front
docker-compose down
docker-compose up -d

foreach ($line in Get-Content $envFile) {
    $args = $line -split "="
    If ($args[0] -And !$args[0].StartsWith("#")) {
        $cmd = '$env:' + $args[0].Trim('"') + '=""'
        Invoke-Expression $cmd
    }
}
$env:API_URL = ""
$env:MEDIA_URL = ""
$env:GEOSHOP_DATA = ""
$env:ENV_FILE = ""

Write-Output ("{0} - END" -f $(Get-Date -Format g))
