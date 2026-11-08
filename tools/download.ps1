param([Parameter(Mandatory=$true)][string]$Url, [Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$address = [uri]$Url
if ($address.Scheme -ne 'https' -or $address.Host -ne 'www.minecraft.net') { throw 'Solo se descarga BDS desde Minecraft oficial por HTTPS.' }
# Windows certificate store and TLS stack; no TLS validation is disabled.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -UseBasicParsing -Uri $address -OutFile $Destination
