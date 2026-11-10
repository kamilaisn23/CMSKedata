<?php
declare(strict_types=1);

function setup(string $method): never {
    global $config,$pdo,$user;
    header('Cache-Control: no-store');
    $token=$config['setup_token']??'';
    if (!is_string($token)||strlen($token)<32) fail(403,'SETUP_DISABLED','Setup dinonaktifkan. Gunakan akun yang diimpor atau siapkan token instalasi.');
    if ((int)sql('SELECT COUNT(*) FROM `User`')->fetchColumn()>0) fail(403,'SETUP_LOCKED','Admin sudah tersedia. Setup terkunci.');
    if ($method==='GET') {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Instalasi Kedata CMS</title><body style="font:16px system-ui;max-width:480px;margin:40px auto;padding:20px"><h1>Instalasi Kedata CMS</h1><p>Buat admin pertama. Jika ingin memakai data lama, import SQL lewat phpMyAdmin terlebih dahulu.</p><form method="post"><p><label>Token instalasi <input name="token" type="password" required autocomplete="off"></label></p><p><label>Nama <input name="name" required></label></p><p><label>Email <input name="email" type="email" required></label></p><p><label>Password (12–72 byte) <input name="password" type="password" minlength="12" maxlength="72" required autocomplete="new-password"></label></p><button>Pasang CMS</button></form></body></html>'; exit;
    }
    if ($method!=='POST') fail(405,'METHOD_NOT_ALLOWED','Gunakan GET atau POST');
    rate('setup:'.($_SERVER['REMOTE_ADDR']??'unknown'),10,300);
    if (!hash_equals($token,text($_POST,'token'))) fail(403,'INVALID_TOKEN','Token instalasi tidak valid');
    $email=strtolower(trim(text($_POST,'email','',1,191))); $name=trim(text($_POST,'name','',1,120)); $password=text($_POST,'password','',12,72);
    if (!$name||!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($password)>72) fail(400,'VALIDATION_ERROR','Periksa nama, email, dan password');
    $pdo->beginTransaction();
    sql('SELECT `id` FROM `CmsLock` WHERE `id`=1 FOR UPDATE')->fetch();
    // Dedicated row serializes first-admin creation without global table locks.
    sql("INSERT IGNORE INTO `CmsRate` (`bucket`,`hits`,`expires`) VALUES ('setup-lock',0,0)");
    sql("SELECT `bucket` FROM `CmsRate` WHERE `bucket`='setup-lock' FOR UPDATE")->fetch();
    if ((int)sql('SELECT COUNT(*) FROM `User`')->fetchColumn()>0) fail(403,'SETUP_LOCKED','Setup sudah selesai');
    $account=create('User',['email'=>$email,'name'=>$name,'passwordHash'=>password_hash($password,PASSWORD_BCRYPT,['cost'=>12]),'role'=>'ADMIN']);
    $key=keyData(); $host=parse_url($config['app_url'],PHP_URL_HOST);
    $site=create('Site',['name'=>'Kedata CMS','slug'=>'kedata-cms','domain'=>$host,'apiKeyHash'=>$key['apiKeyHash'],'apiKeyPrefix'=>$key['apiKeyPrefix']]);
    create('SiteSetting',['siteId'=>$site['id'],'siteTitle'=>$site['name']]);
    $user=publicUser($account); audit($site['id'],'INSTALL','Site',$site['id']);
    // Rotate the generated API key through the dashboard when needed; never expose it in HTML.
    respond(['success'=>true,'message'=>'Instalasi selesai. Kosongkan setup_token di config.php, lalu buka /login.'],201);
}
function feed(string $path): never {
    global $pdo;
    $slug=text($_GET,'site','kedata-tech');
    $site=first('Site','`slug`=?',[$slug]);
    if (!$site) fail(404,'SITE_NOT_FOUND','Situs tidak ditemukan');
    publishDue($site['id']);
    $xml=fn($s)=>htmlspecialchars((string)$s,ENT_XML1|ENT_QUOTES,'UTF-8');
    $base='https://'.preg_replace('~^https?://~','',$site['domain']); $base=rtrim($base,'/');
    header('Content-Type: application/xml; charset=utf-8'); header('Cache-Control: public, max-age=600');
    if (str_ends_with($path,'rss.xml')) {
        $setting=first('SiteSetting','`siteId`=?',[$site['id']]);
        $out='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>'.$xml($setting['siteTitle']??$site['name']).'</title><link>'.$xml($base).'</link><description>'.$xml($site['description']).'</description>';
        foreach (rows('Post','`siteId`=? AND `status`=?',[$site['id'],'PUBLISHED'],'`publishedAt` DESC LIMIT 50') as $post) $out.='<item><title>'.$xml($post['title']).'</title><link>'.$xml($base.'/posts/'.$post['slug']).'</link><guid>'.$xml($base.'/posts/'.$post['slug']).'</guid><pubDate>'.$xml(gmdate(DATE_RSS,strtotime($post['publishedAt']??$post['createdAt']))).'</pubDate><description>'.$xml($post['excerpt']).'</description></item>';
        $out.='</channel></rss>';
    } else {
        $out='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'.$xml($base.'/').'</loc></url>';
        foreach (['Page'=>'pages','Post'=>'posts'] as $table=>$prefix) foreach (rows($table,'`siteId`=? AND `status`=?',[$site['id'],'PUBLISHED']) as $record) $out.='<url><loc>'.$xml($base.'/'.$prefix.'/'.$record['slug']).'</loc><lastmod>'.$xml(substr($record['updatedAt'],0,10)).'</lastmod></url>';
        $out.='</urlset>';
    }
    echo $out; exit;
}
