<?php
declare(strict_types=1);
ini_set('display_errors','0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH) ?: '/');
$method=$_SERVER['REQUEST_METHOD'];
if (preg_match('~^/cms-private(?:/|$)|/\.|\.(?:db|sqlite|sql|log|bak)$~i',$path)) { http_response_code(403); exit; }
$needsDb=str_starts_with($path,'/api/')||in_array($path,['/health','/setup','/rss.xml','/sitemap.xml'],true);
if ($path==='/robots.txt') { header('Content-Type: text/plain'); echo "User-agent: *\nAllow: /\nDisallow: /api/admin/\nDisallow: /cms-private/\nSitemap: /sitemap.xml\n"; exit; }
if ($path==='/openapi.json'||$path==='/admin-openapi.json') {
    header('Content-Type: application/json'); readfile(__DIR__.$path); exit;
}
if ($path==='/docs') {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>API Kedata CMS</title><link rel="stylesheet" href="/kedata-docs.css"><body style="font:16px system-ui;max-width:900px;margin:40px auto;padding:20px"><h1>API Kedata CMS</h1><p>Gunakan API Explorer di dashboard untuk mencoba endpoint dengan sesi yang sah. InfinityFree dapat memblokir klien API di luar browser.</p><p><a href="/openapi.json">OpenAPI publik</a> · <a href="/admin-openapi.json">OpenAPI admin</a> · <a href="/dashboard">Dashboard & API Explorer</a></p>';
    $spec=json_decode(file_get_contents(__DIR__.'/openapi.json'),true);
    foreach ($spec['paths']??[] as $endpoint=>$methods) foreach ($methods as $verb=>$info) echo '<article><h2>'.htmlspecialchars(strtoupper($verb).' '.$endpoint).'</h2><p>'.htmlspecialchars($info['summary']??'').'</p></article>';
    echo '</body></html>'; exit;
}
if (!$needsDb) {
    if ($method!=='GET'&&$method!=='HEAD') { http_response_code(405); exit; }
    if (!is_file(__DIR__.'/index.html')) { http_response_code(503); echo 'Frontend belum dibuild. Gunakan paket hasil build InfinityFree.'; exit; }
    header('Content-Type: text/html; charset=utf-8'); header('Cache-Control: no-cache');
    if ($method!=='HEAD') readfile(__DIR__.'/index.html'); exit;
}
require __DIR__.'/cms-private/core.php';
require __DIR__.'/cms-private/admin.php';
require __DIR__.'/cms-private/public.php';
require __DIR__.'/cms-private/backup.php';
require __DIR__.'/cms-private/setup-feeds.php';
$pdo=null; $user=null; $webhooks=[]; $deleteFiles=[];
try {
    $configFile=__DIR__.'/cms-private/config.php';
    if (!is_file($configFile)) fail(503,'SETUP_REQUIRED','Lengkapi cms-private/config.php sesuai panduan upload');
    $config=require $configFile;
    $dsn='mysql:host='.$config['db_host'].';'.(isset($config['db_port'])?'port='.(int)$config['db_port'].';':'').'dbname='.$config['db_name'].';charset=utf8mb4';
    $pdo=new PDO($dsn,$config['db_user'],$config['db_password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
    $models=json_decode(file_get_contents(__DIR__.'/cms-private/models.json'),true,512,JSON_THROW_ON_ERROR);
    if ($path==='/health') { sql('SELECT 1'); throw new HttpResult(['status'=>'healthy','timestamp'=>now(),'backend'=>'php-mysql']); }
    if ($path==='/setup') setup($method);
    if (in_array($path,['/rss.xml','/sitemap.xml','/api/v1/rss.xml','/api/v1/sitemap.xml'],true)) feed($path);
    if ($path==='/api/admin'||str_starts_with($path,'/api/admin/')) {
        header('Cache-Control: no-store');
        $parts=explode('/',trim(substr($path,10),'/'));
        $body=[];
        if (in_array($method,['POST','PUT','PATCH','DELETE'],true)) {
            $origin=$_SERVER['HTTP_ORIGIN']??null;
            if (($origin&&rtrim($origin,'/')!==rtrim($config['app_url'],'/'))||($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site') fail(403,'ORIGIN_FORBIDDEN','Permintaan harus berasal dari situs CMS');
            if (str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json')) {
                try { $decoded=json_decode(file_get_contents('php://input'),true,512,JSON_THROW_ON_ERROR); }
                catch (JsonException) { fail(400,'INVALID_JSON','JSON tidak valid'); }
                if (!is_array($decoded)||array_is_list($decoded)&&$decoded!==[]) fail(400,'INVALID_JSON','Body harus berupa object JSON');
                $body=$decoded;
            } elseif (!str_starts_with($_SERVER['CONTENT_TYPE']??'','multipart/form-data')&&($_SERVER['CONTENT_LENGTH']??0)>0) fail(415,'UNSUPPORTED_MEDIA_TYPE','Gunakan JSON atau multipart upload');
            $pdo->beginTransaction();
            sql('SELECT `id` FROM `CmsLock` WHERE `id`=1 FOR UPDATE')->fetch();
        }
        admin($parts,$method,$body);
    }
    if ($path==='/api/v1'||str_starts_with($path,'/api/v1/')) publicApi(explode('/',trim(substr($path,7),'/')),$method);
    fail(404,'NOT_FOUND','Endpoint tidak ditemukan');
} catch (HttpResult $result) {
    if ($pdo?->inTransaction()) { if ($result->status<400) $pdo->commit(); else $pdo->rollBack(); }
    if ($result->status<400) {
        foreach ($deleteFiles as $file) if (is_file($file)) unlink($file);
        deliverWebhooks();
    }
    http_response_code($result->status);
    if ($result->payload!==null) { header('Content-Type: application/json; charset=utf-8'); echo json_encode($result->payload,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
} catch (Throwable $error) {
    if ($pdo?->inTransaction()) $pdo->rollBack();
    $duplicate=$error instanceof PDOException&&($error->errorInfo[1]??null)===1062;
    http_response_code($duplicate?409:500); header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['data'=>null,'error'=>['code'=>$duplicate?'DUPLICATE_VALUE':'INTERNAL_ERROR','message'=>$duplicate?'Email atau slug sudah digunakan':'Gagal memproses permintaan. Periksa konfigurasi dan log server.']]);
    // Do not log query parameters, credentials, content, or connection messages.
    error_log('Kedata PHP request failed: '.get_class($error).' at '.basename($error->getFile()).':'.$error->getLine());
}
