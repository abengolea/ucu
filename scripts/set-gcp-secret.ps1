<#
.SYNOPSIS
  Carga el valor de un secreto en Google Secret Manager sin dejarlo en el historial.

.EXAMPLE
  ./scripts/set-gcp-secret.ps1 MERCADOPAGO_WEBHOOK_SECRET

  Abre Notepad, pegás el valor, guardás (Ctrl+S) y cerrás.
  El script espera a que cierres, sube el valor y borra el archivo temporal.
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [string]$Project = 'ucuweb-2887d'
)

$ErrorActionPreference = 'Stop'

$tmp = Join-Path $env:TEMP ("secret-" + [guid]::NewGuid().ToString('N') + '.txt')
New-Item -ItemType File -Path $tmp -Force | Out-Null

try {
  Write-Host ""
  Write-Host "  Se abrio Notepad. Pega el valor de $Name, guarda (Ctrl+S) y cierra la ventana." -ForegroundColor Cyan
  Write-Host ""

  Start-Process notepad.exe -ArgumentList $tmp -Wait

  $raw = Get-Content -Path $tmp -Raw -ErrorAction SilentlyContinue
  $value = if ($null -eq $raw) { '' } else { $raw.Trim() }

  if ($value.Length -lt 8) {
    Write-Host "  El archivo quedo vacio o con muy pocos caracteres ($($value.Length)). No se subio nada." -ForegroundColor Red
    Write-Host "  Volve a correr el script y acordate de guardar con Ctrl+S antes de cerrar." -ForegroundColor Red
    exit 1
  }

  # Reescribir sin salto de linea final para que el payload sea exacto.
  [System.IO.File]::WriteAllText($tmp, $value, [System.Text.Encoding]::ASCII)

  gcloud secrets versions add $Name --project=$Project --data-file="$tmp"
  if ($LASTEXITCODE -ne 0) { throw "gcloud fallo al subir el secreto." }

  Write-Host ""
  Write-Host "  Listo: $Name cargado ($($value.Length) caracteres)." -ForegroundColor Green
}
finally {
  if (Test-Path $tmp) { Remove-Item $tmp -Force }
}
