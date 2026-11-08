$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
}
function Need-Tool($command, $package) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw "Falta $command y winget. Instala $package y vuelve a ejecutar este archivo." }
        Write-Host "Instalando $package..."
        & winget install --id $package --exact --source winget --disable-interactivity --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) { throw "No se pudo instalar $package" }
        Refresh-Path
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw 'Cierra esta ventana y vuelve a abrir PREPARAR-EQUIPO.cmd para cargar las herramientas.' }
    }
}
Need-Tool 'git' 'Git.Git'
Need-Tool 'gh' 'GitHub.cli'
Need-Tool 'python' 'Python.Python.3.14'
& python -c 'import sys; assert sys.version_info >= (3,11), "Se requiere Python 3.11 o posterior"'
if ($LASTEXITCODE -ne 0) { throw 'Python no esta disponible o su version no sirve.' }
& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Inicia sesion con tu propia cuenta GitHub, que debe tener acceso al repositorio privado.'
    & gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { throw 'Falta completar el inicio de sesion.' }
}
& gh auth setup-git
if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar Git a GitHub.' }
$projectRoot = (Get-Location).Path
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.git'))) {
    # Kit descargado como ZIP. Clonar al lado, sin borrar o mezclar carpetas.
    $destination = Join-Path (Split-Path -Parent $projectRoot) 'WARLAND-Equipo'
    if (Test-Path -LiteralPath $destination) { throw "Ya existe $destination. Abre su PREPARAR-EQUIPO.cmd; no se reemplaza." }
    & gh repo clone Dona12p4/warland-bedrock-equipo $destination
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar el repositorio. Revisar acceso/invitacion.' }
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $destination 'tools/bootstrap.ps1')
    exit $LASTEXITCODE
}
& python tools/team.py sync
if ($LASTEXITCODE -ne 0) { throw 'Resolver los cambios pendientes antes de continuar.' }
$configuredName = & git config user.name
if (-not $configuredName) {
    $gitLogin = & gh api user --jq .login
    & git config user.name $gitLogin
}
$configuredEmail = & git config user.email
if (-not $configuredEmail) {
    $gitLogin = & gh api user --jq .login
    $gitAccountId = & gh api user --jq .id
    & git config user.email "$gitAccountId+$gitLogin@users.noreply.github.com"
}
New-Item -ItemType Directory -Path '.local' -Force | Out-Null
if (-not (Test-Path '.local/user.json')) {
    $gamertag = Read-Host 'Tu gamertag Xbox para permitirte entrar al laboratorio'
    if ([string]::IsNullOrWhiteSpace($gamertag)) { throw 'Se necesita el gamertag para la lista de acceso local.' }
    @{gamertag=$gamertag.Trim();port=19152} | ConvertTo-Json | Set-Content '.local/user.json' -Encoding UTF8
}
& python tools/team.py hooks
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las comprobaciones locales.' }
& python tools/team.py setup-server
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar BDS.' }
& python tools/team.py prepare-lab
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la copia; revisar el mensaje anterior.' }
Write-Host ''
Write-Host 'LISTO. Abre esta carpeta como proyecto local en Codex/ChatGPT.' -ForegroundColor Green
Write-Host (Get-Location).Path
Write-Host 'Para jugar la prueba: ACTUALIZAR-Y-PROBAR.cmd y Minecraft Bedrock, 127.0.0.1 puerto 19152.'
Write-Host 'Para detener BDS: escribe stop y espera Quit correctly. No se abren puertos del router.'
Write-Host 'Los permisos de Windows y de Minecraft los acepta la persona si aparecen.'
