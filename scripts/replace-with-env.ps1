$callback = {
    param($match)
    $env:PWD = Split-Path $PSScriptRoot -Parent
    $env_path = "Env:" + $match.Groups[1]
    If (Test-Path $env_path) {
        $env_data = Get-Item -Path $env_path
        return $env_data.Value
    }
    return ""
}

Function Replace-With-Env {
    param(
        [Parameter(Mandatory)]
        [string]$InFile,
        [Parameter(Mandatory)]
        [string]$OutFile
    )
    $file_content = (Get-Content -path $InFile) -join "`n"
    $file_content = [regex]::Replace($file_content,'\$\{([A-Z_]+)\}',$callback)
    [IO.File]::WriteAllLines($OutFile, $file_content)
}
