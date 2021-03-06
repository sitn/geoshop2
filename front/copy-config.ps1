$FilePath = "./src/assets/configs/config.json"

$snapshot = (Get-Content ($FilePath) | ConvertFrom-Json)

$apiKey = "apiUrl"
$mediaKey = "mediaUrl"

$apiUrl = "http://localhost:8000/"
$mediaUrl = "https://sitn.ne.ch/geoshop2_media/"

Invoke-Expression ('$snapshot.' + $apiKey + "='" + $apiUrl + "'")
Invoke-Expression ('$snapshot.' + $mediaKey + "='" + $mediaUrl + "'")

$snapshot | ConvertTo-Json -Depth 100 | set-content $FilePath
