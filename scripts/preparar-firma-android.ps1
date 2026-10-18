# Ejecutar UNA VEZ en el PC del dueño. Nunca enviar la clave por chat ni subirla al repo.
$ErrorActionPreference = 'Stop'
$TaskKeytool = $null
if ($env:JAVA_HOME) {
    $TaskCandidate = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
    if (Test-Path $TaskCandidate) { $TaskKeytool = $TaskCandidate }
}
if (-not $TaskKeytool) {
    $TaskCandidate = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\keytool.exe'
    if (Test-Path $TaskCandidate) { $TaskKeytool = $TaskCandidate }
}
if (-not $TaskKeytool) {
    $TaskCommand = Get-Command keytool -ErrorAction SilentlyContinue
    if ($TaskCommand) { $TaskKeytool = $TaskCommand.Source }
}
if (-not $TaskKeytool) { throw 'Instala Android Studio o un JDK y vuelve a ejecutar este comando.' }
$TaskFolder = Join-Path $env:USERPROFILE 'Reparto-firma-privada'
$TaskKeyFile = Join-Path $TaskFolder 'reparto.p12'
$TaskBundleFile = Join-Path $TaskFolder 'ANDROID_SIGNING_BUNDLE.txt'
if (Test-Path $TaskBundleFile) {
    Set-Clipboard -Value ([IO.File]::ReadAllText($TaskBundleFile))
    Write-Host 'Se copió la firma existente. NO generes otra para futuras versiones.'
} else {
    if (Test-Path $TaskKeyFile) { throw 'Ya existe reparto.p12. Conserva tu firma anterior; no se sobrescribirá.' }
    New-Item -ItemType Directory -Path $TaskFolder -Force | Out-Null
    $TaskRandom = New-Object byte[] 32
    $TaskRng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $TaskRng.GetBytes($TaskRandom)
    $TaskRng.Dispose()
    $env:REPARTO_TEMP_SIGN_PASSWORD = [Convert]::ToBase64String($TaskRandom)
    try {
        & $TaskKeytool -genkeypair -noprompt -storetype PKCS12 -keystore $TaskKeyFile -alias reparto -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Reparto, O=Reparto, C=CL' -storepass:env REPARTO_TEMP_SIGN_PASSWORD -keypass:env REPARTO_TEMP_SIGN_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar la firma.' }
        $TaskBundle = @{
            keystore = [Convert]::ToBase64String([IO.File]::ReadAllBytes($TaskKeyFile))
            password = $env:REPARTO_TEMP_SIGN_PASSWORD
            alias = 'reparto'
        } | ConvertTo-Json -Compress
        [IO.File]::WriteAllText($TaskBundleFile, $TaskBundle)
        Set-Clipboard -Value $TaskBundle
    } finally { Remove-Item Env:\REPARTO_TEMP_SIGN_PASSWORD -ErrorAction SilentlyContinue }
}
Write-Host 'Firma privada copiada al portapapeles. Guárdala como secreto de Actions con nombre ANDROID_SIGNING_BUNDLE.'
Write-Host 'Conserva una copia privada y segura de Reparto-firma-privada. Nunca la subas al repositorio ni la pegues en un chat.'
Start-Process 'https://github.com/appojatickets/reparto-front/settings/secrets/actions/new'
