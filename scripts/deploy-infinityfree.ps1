# Deploy Kedata CMS (varian InfinityFree) ke hosting lewat FTP.
# Pakai: isi scripts/infinityfree-ftp.json (salin dari infinityfree-ftp.example.json),
# lalu jalankan: powershell -ExecutionPolicy Bypass -File scripts\deploy-infinityfree.ps1
# Lihat file yang akan diupload tanpa FTP: tambahkan -ListOnly.

param(
  [string]$ZipPath = '',
  [string]$FtpConfig = '',
  [string]$CmsConfig = '',
  [switch]$ListOnly
)

$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $ZipPath) { $ZipPath = Join-Path $root 'artifacts\infinityfree\CSM-InfinityFree-upload.zip' }
if (-not $FtpConfig) { $FtpConfig = Join-Path $PSScriptRoot 'infinityfree-ftp.json' }
$ZipPath = [IO.Path]::GetFullPath($ZipPath)

if (-not (Test-Path -LiteralPath $ZipPath)) {
  throw "Paket upload tidak ditemukan: $ZipPath. Jalankan dulu: node scripts/build-infinityfree.mjs"
}

$work = Join-Path $root '.cache\infinityfree-deploy'
if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
New-Item -ItemType Directory -Path $work | Out-Null
Write-Host "Ekstrak paket: $ZipPath"
Expand-Archive -LiteralPath $ZipPath -DestinationPath $work -Force

$htdocs = Join-Path $work 'htdocs'
if (-not (Test-Path -LiteralPath (Join-Path $htdocs 'index.php'))) {
  throw "Paket tidak berisi htdocs/index.php. Paket mungkin bukan hasil build InfinityFree."
}

if ($CmsConfig) {
  $CmsConfig = [IO.Path]::GetFullPath($CmsConfig)
  if (-not (Test-Path -LiteralPath $CmsConfig)) { throw "config.php lokal tidak ditemukan: $CmsConfig" }
  Copy-Item -LiteralPath $CmsConfig -Destination (Join-Path $htdocs 'cms-private\config.php') -Force
  Write-Host "config.php lokal akan ikut terupload sebagai cms-private/config.php"
}

$files = Get-ChildItem -LiteralPath $htdocs -Recurse -File | Sort-Object FullName
$totalKb = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1KB)
Write-Host ("File akan diupload: {0} file, {1} KB" -f $files.Count, $totalKb)

if ($ListOnly) {
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($htdocs.Length + 1).Replace('\', '/')
    Write-Host ("  {0,10} {1}" -f [math]::Round($f.Length / 1KB), $rel)
  }
  Write-Host 'Mode -ListOnly: tidak ada yang diupload.'
  return
}

if (-not (Test-Path -LiteralPath $FtpConfig)) {
  throw ("Konfigurasi FTP tidak ditemukan: {0}. Salin scripts/infinityfree-ftp.example.json menjadi scripts/infinityfree-ftp.json lalu isi host, user, dan password FTP dari panel InfinityFree. File tersebut diabaikan Git." -f $FtpConfig)
}
$ftp = Get-Content -LiteralPath $FtpConfig -Raw | ConvertFrom-Json
foreach ($key in 'host', 'user', 'password') {
  if (-not $ftp.$key) { throw "Field '$key' kosong di infinityfree-ftp.json" }
}
$port = if ($ftp.port) { [int]$ftp.port } else { 21 }
$remotePath = if ($ftp.remotePath) { $ftp.remotePath.TrimEnd('/') } else { '/' }
$base = "ftp://$($ftp.host):$port$remotePath"
$script:cred = New-Object System.Net.NetworkCredential($ftp.user, $ftp.password)
$script:useTls = $true

function New-FtpRequest([string]$uri, [string]$method) {
  $req = [System.Net.FtpWebRequest]::Create($uri)
  $req.Method = $method
  $req.Credentials = $script:cred
  $req.UseBinary = $true
  $req.UsePassive = $true
  $req.KeepAlive = $false
  $req.EnableSsl = $script:useTls
  $req.Timeout = 60000
  return $req
}

function Invoke-FtpSafe([string]$uri, [string]$method, [string]$ignorePattern) {
  try {
    $resp = (New-FtpRequest $uri $method).GetResponse()
    $resp.Close()
    return $true
  } catch [System.Net.WebException] {
    $msg = $_.Exception.Message
    if ($ignorePattern -and $msg -match $ignorePattern) { return $false }
    if ($script:useTls -and $msg -match 'SSL|TLS|secure|Security') {
      $script:useTls = $false
      $resp = (New-FtpRequest $uri $method).GetResponse()
      $resp.Close()
      return $true
    }
    throw
  }
}

# InfinityFree: home FTP memang sudah berada di htdocs, jadi "/" yang benar.
# Bila remotePath di-set '/htdocs' dan ternyata tidak ada (550), jatuhkan ke '/'.
if ($remotePath -ne '/' -and -not (Invoke-FtpSafe "ftp://$($ftp.host):$port$remotePath" ([System.Net.WebRequestMethods+Ftp]::ListDirectory) '550')) {
  Write-Host "Folder $remotePath tidak ada di FTP; beralih ke / (home)."
  $remotePath = '/'
}

Write-Host "Koneksi ke $($ftp.host):$port (user $($ftp.user))..."
Invoke-FtpSafe $base ([System.Net.WebRequestMethods+Ftp]::ListDirectory) $null | Out-Null
Write-Host "Terhubung ($(if ($script:useTls) {'FTPS/TLS'} else {'FTP tanpa TLS'})). Target: $remotePath"

# Hilangkan index2.html bawaan host agar index.html CMS yang tampil.
if (Invoke-FtpSafe "$base/index2.html" ([System.Net.WebRequestMethods+Ftp]::DeleteFile) '550') {
  Write-Host 'index2.html bawaan InfinityFree dihapus.'
}

$remoteDirs = @()
foreach ($f in $files) {
  $dir = $f.DirectoryName.Substring($htdocs.Length).Replace('\', '/')
  if ($dir -and $remoteDirs -notcontains $dir) { $remoteDirs += $dir }
}
foreach ($dir in $remoteDirs) {
  Invoke-FtpSafe "$base$dir" ([System.Net.WebRequestMethods+Ftp]::MakeDirectory) '550' | Out-Null
}

$i = 0
foreach ($f in $files) {
  $i++
  $rel = $f.FullName.Substring($htdocs.Length + 1).Replace('\', '/')
  $req = New-FtpRequest "$base/$rel" ([System.Net.WebRequestMethods+Ftp]::UploadFile)
  $req.ContentLength = $f.Length
  $in = [IO.File]::OpenRead($f.FullName)
  try {
    $stream = $req.GetRequestStream()
    try { $in.CopyTo($stream) } finally { $stream.Dispose() }
  } finally { $in.Dispose() }
  $resp = $req.GetResponse()
  $status = "$($resp.StatusCode)"
  $resp.Close()
  if ($status -ne 'ClosingData') { throw "Upload gagal untuk $rel : $status" }
  Write-Host ("[{0}/{1}] {2,8} KB  {3}" -f $i, $files.Count, [math]::Round($f.Length / 1KB), $rel)
}

Write-Host ''
Write-Host 'Upload selesai. Langkah manual yang tersisa:'
Write-Host "  1. phpMyAdmin: import schema.sql dari paket (lalu .backups\infinityfree-migration\import-current-data.sql bila pindah data lama)."
if ($CmsConfig) {
  Write-Host '  2. config.php sudah ikut terupload. Setelah /setup selesai, kosongkan setup_token di file lokal lalu jalankan ulang script ini.'
} else {
  Write-Host '  2. File Manager: salin cms-private/config.example.php menjadi config.php lalu isi kredensial MySQL + setup_token (>=32 karakter acak).'
}
Write-Host '  3. Instalasi baru: buka https://domain-anda/setup, buat admin pertama, lalu kosongkan setup_token.'
Write-Host '  4. Cek https://domain-anda/health harus membalas healthy, coba login, dan pastikan /cms-private/config.php balas 403.'
if ($ftp.site_url) {
  Write-Host ''
  Write-Host "Cek cepat (kalau diblokir browser-security InfinityFree, buka manual di browser): $($ftp.site_url)/health"
  try {
    $r = Invoke-WebRequest -Uri "$($ftp.site_url)/health" -UseBasicParsing -TimeoutSec 20 -UserAgent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    Write-Host "Jawaban /health: $($r.StatusCode) $($r.Content)"
  } catch {
    Write-Host '/health tidak bisa dicek dari sini (wajar di InfinityFree). Cek manual di browser.'
  }
}
