<?php
declare(strict_types=1);

function siteInput(array $b, bool $partial): array {
    $data = [];
    foreach (['name','slug','domain','description','corsOrigins','webhookUrl','webhookSecret','rateLimit'] as $key) {
        if ($partial && !array_key_exists($key, $b)) continue;
        $data[$key] = match ($key) {
            'name' => text($b, $key, '', 2, 191), 'slug' => slug($b), 'domain' => text($b, $key, '', 3, 2000),
            'rateLimit' => $b[$key] ?? 120, 'corsOrigins' => text($b, $key, '*'), default => text($b, $key),
        };
    }
    if (isset($data['rateLimit']) && (!is_int($data['rateLimit']) || $data['rateLimit'] < 10 || $data['rateLimit'] > 1000)) fail(400,'VALIDATION_ERROR','Batas API harus 10–1000 per menit');
    if (!empty($data['webhookUrl']) && !preg_match('~^https?://~i', $data['webhookUrl'])) fail(400,'VALIDATION_ERROR','URL webhook harus HTTP/HTTPS');
    return $data;
}
function contentInput(string $table, array $b, string $siteId): array {
    $data = ['title'=>text($b,'title','',1), 'slug'=>slug($b), 'contentHtml'=>cleanHtml(text($b,'contentHtml')),
        'contentJson'=>jsonText($b,'contentJson','{}'), 'status'=>text($b,'status','DRAFT')];
    $statuses = $table === 'Post' ? ['DRAFT','PUBLISHED','SCHEDULED'] : ['DRAFT','PUBLISHED'];
    if (!in_array($data['status'],$statuses,true)) fail(400,'VALIDATION_ERROR','Status tidak valid');
    if (!publisher() && $data['status'] !== 'DRAFT') fail(403,'FORBIDDEN','Hanya penerbit dapat menerbitkan konten');
    foreach (['metaTitle','metaDescription','ogImage'] as $key) $data[$key] = text($b,$key);
    if ($table === 'Post') {
        foreach (['excerpt','featuredImage'] as $key) $data[$key] = text($b,$key);
        $category = $b['categoryId'] ?? null;
        if ($category === '') $category = null;
        if ($category !== null && (!is_string($category) || !first('Category','`id`=? AND `siteId`=?',[$category,$siteId]))) fail(403,'FORBIDDEN','Kategori bukan milik situs ini');
        $data['categoryId'] = $category; $data['scheduledAt'] = dateText($b['scheduledAt'] ?? null);
        if ($data['status'] === 'SCHEDULED' && !$data['scheduledAt']) fail(400,'VALIDATION_ERROR','Tanggal jadwal wajib diisi');
        $tags = $b['tagIds'] ?? [];
        if (!is_array($tags) || !array_is_list($tags)) fail(400,'VALIDATION_ERROR','Tag harus berupa daftar');
        foreach ($tags as $tag) if (!is_string($tag) || !first('Tag','`id`=? AND `siteId`=?',[$tag,$siteId])) fail(403,'FORBIDDEN','Tag bukan milik situs ini');
    }
    return $data;
}
function saveTags(string $postId, array $b): void {
    sql('DELETE FROM `PostTag` WHERE `postId`=?',[$postId]);
    foreach (array_unique($b['tagIds'] ?? []) as $tagId) create('PostTag',['postId'=>$postId,'tagId'=>$tagId]);
}
function userSave(?string $id, array $b): never {
    global $user;
    $name = trim(text($b,'name','',1,120)); $email = strtolower(trim(text($b,'email','',1,191)));
    $role = text($b,'role'); $password = text($b,'password'); $sites = $b['siteIds'] ?? [];
    if (!$name || !filter_var($email,FILTER_VALIDATE_EMAIL) || !in_array($role,['ADMIN','MANAGER','EDITOR','PUBLISHER'],true) || !is_array($sites) || !array_is_list($sites)) fail(400,'VALIDATION_ERROR','Periksa nama, email, peran, dan situs');
    if ((!$id || $password !== '') && (mb_strlen($password)<12 || strlen($password)>72)) fail(400,'VALIDATION_ERROR','Password minimal 12 karakter dan maksimal 72 byte');
    if ($id === $user['id'] && $role !== 'ADMIN') fail(400,'SELF_ROLE_CHANGE','Admin tidak dapat menurunkan perannya sendiri');
    foreach ($sites as $site) { if (!is_string($site)) fail(400,'INVALID_SITE','Situs tidak valid'); get('Site',$site); }
    $data = ['name'=>$name,'email'=>$email,'role'=>$role];
    if ($password !== '') $data['passwordHash'] = password_hash($password,PASSWORD_BCRYPT,['cost'=>12]);
    if ($id) { get('User',$id,true); $saved=update('User',$id,$data); sql('DELETE FROM `SiteMembership` WHERE `userId`=?',[$id]); sql('DELETE FROM `Session` WHERE `userId`=?',[$id]); }
    else $saved=create('User',$data);
    foreach (array_unique($sites) as $site) create('SiteMembership',['userId'=>$saved['id'],'siteId'=>$site]);
    audit(null,$id?'UPDATE_ACCESS':'CREATE_USER','User',$saved['id'],['role'=>$role,'siteIds'=>$sites]);
    respond(publicUser($saved),$id?200:201);
}
function review(string $table, array $record, array $b, string $method): never {
    $actions = ['submit'=>'SUBMIT_REVIEW','approve'=>'APPROVE_REVIEW','return'=>'RETURN_REVIEW'];
    if ($method === 'GET') {
        $logs = rows('AuditLog','`entityType`=? AND `entityId`=? AND `action` IN (?,?,?)',[$table,$record['id'],...array_values($actions)],'`createdAt` DESC LIMIT 10');
        respond(array_map(function($log) { $log = array_intersect_key($log,array_flip(['id','action','actor','createdAt','details'])); $log['details']=json_decode($log['details'],true) ?: (object)[]; return $log; },$logs));
    }
    if ($method !== 'POST') fail(405,'METHOD_NOT_ALLOWED','Metode tidak tersedia');
    $action = text($b,'action'); $note = trim(text($b,'note','',0,2000));
    if (!isset($actions[$action]) || ($action === 'return' && !$note)) fail(400,'VALIDATION_ERROR','Periksa aksi dan catatan review');
    if ($action !== 'submit' && !publisher()) fail(403,'FORBIDDEN','Hanya penerbit dapat memutuskan review');
    if ($record['status'] !== ($action === 'submit'?'DRAFT':'IN_REVIEW') || ($b['updatedAt'] ?? '') !== $record['updatedAt']) fail(409,'REVIEW_CONFLICT','Status atau isi konten berubah. Muat ulang daftar.');
    snapshot($table,$record);
    $data=['status'=>$action==='submit'?'IN_REVIEW':($action==='approve'?'PUBLISHED':'DRAFT')];
    if ($action==='approve') $data['publishedAt']=now();
    $saved=update($table,$record['id'],$data);
    audit($record['siteId'],$actions[$action],$table,$record['id'],['note'=>$note]);
    if ($action==='approve') webhook($record['siteId'],strtolower($table).'.published',$table,$record['id'],['title'=>$record['title'],'slug'=>$record['slug']]);
    respond($saved);
}
function calendar(): never {
    global $user;
    $month=$_GET['month'] ?? '';
    if (!is_string($month) || !preg_match('/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/D',$month) || substr($month,0,4)==='9999') fail(400,'INVALID_MONTH','Bulan harus berformat YYYY-MM (1900–9998)');
    $siteId=$_GET['siteId'] ?? null; if ($siteId !== null) accessSite($siteId);
    $start=new DateTimeImmutable($month.'-01T00:00:00+07:00'); $end=$start->modify('+1 month');
    $events=[]; $queue=[]; $counts=['scheduled'=>0,'published'=>0,'draft'=>0,'review'=>0];
    foreach (['Page','Post'] as $table) {
        $where='1=1'; $params=[];
        if ($siteId) { $where='`siteId`=?'; $params=[$siteId]; }
        elseif ($user['role']!=='ADMIN') { $where=$user['siteIds']?'`siteId` IN ('.implode(',',array_fill(0,count($user['siteIds']),'?')).')':'1=0'; $params=$user['siteIds']; }
        // Only relevant records enter memory; no scan of rendered HTML for calendar.
        $utcStart=$start->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
        $utcEnd=$end->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
        $dateFilter=$table==='Post'?' OR (`status`=\'SCHEDULED\' AND `scheduledAt`>=? AND `scheduledAt`<?)':'';
        $query="($where) AND (`status` IN ('DRAFT','IN_REVIEW') OR (`status`='PUBLISHED' AND `publishedAt`>=? AND `publishedAt`<?)$dateFilter)";
        $params=[...$params,$utcStart,$utcEnd,...($table==='Post'?[$utcStart,$utcEnd]:[])];
        foreach (rows($table,$query,$params) as $row) {
            $entry=array_intersect_key($row,array_flip(['id','title','siteId','status','updatedAt']));
            $entry['kind']=strtoupper($table); $entry['siteName']=get('Site',$row['siteId'])['name']; $entry['at']=null;
            if (in_array($row['status'],['DRAFT','IN_REVIEW'],true)) { $counts[$row['status']==='DRAFT'?'draft':'review']++; $queue[]=$entry; continue; }
            $entry['at']=$row['status']==='SCHEDULED'?$row['scheduledAt']:$row['publishedAt'];
            $counts[$row['status']==='SCHEDULED'?'scheduled':'published']++; $events[]=$entry;
        }
    }
    usort($events,fn($a,$b)=>strcmp($a['at'],$b['at']) ?: strcmp($a['id'],$b['id']));
    usort($queue,fn($a,$b)=>strcmp($b['updatedAt'],$a['updatedAt']) ?: strcmp($a['id'],$b['id']));
    respond(['events'=>$events,'queue'=>array_slice($queue,0,12),'counts'=>$counts]);
}
function uploadMedia(?string $siteId): never {
    if (!$siteId && isset($_POST['siteId'])) { $siteId=text($_POST,'siteId'); accessSite($siteId); }
    $f=$_FILES['file'] ?? null;
    if (!$f || $f['error']!==UPLOAD_ERR_OK) fail(400,'UPLOAD_ERROR','Upload gagal. Periksa file dan batas upload hosting.');
    $types=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','application/pdf'=>'pdf'];
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!isset($types[$mime])) fail(400,'INVALID_FILE_TYPE','Hanya JPG, PNG, WEBP dan PDF diperbolehkan');
    if ($f['size']>10*1024*1024) fail(413,'FILE_TOO_LARGE','Ukuran file maksimal 10 MiB atau mengikuti batas hosting');
    $name='kd_'.bin2hex(random_bytes(16)).'.'.$types[$mime]; $target=dirname(__DIR__).'/uploads/'.$name;
    if (!move_uploaded_file($f['tmp_name'],$target)) fail(500,'UPLOAD_ERROR','Gagal menyimpan file');
    try {
        $saved=create('Media',['siteId'=>$siteId,'filename'=>$name,'originalName'=>basename($f['name']),'mimeType'=>$mime,'sizeBytes'=>$f['size'],'url'=>'/uploads/'.$name,'altText'=>text($_POST,'altText'),'caption'=>text($_POST,'caption')]);
        audit($siteId,'UPLOAD','Media',$saved['id'],['filename'=>$name]);
    } catch (Throwable $e) { unlink($target); throw $e; }
    respond($saved,201);
}
function admin(array $parts, string $method, array $b): never {
    global $user;
    [$resource,$id,$action]=array_pad($parts,3,null);
    if ($resource==='login' && $method==='POST') {
        // Failed attempts committed separately by the dispatcher, even on 401.
        $bucket='login:'.($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        rate($bucket,5,300,false);
        $email=text($b,'email','',1,191); $password=text($b,'password','',1,72);
        $account=first('User','`email`=?',[$email]);
        $dummy='$2y$12$EAJ7Q5ZtDQGDKQFyVTu0hOKOdpEjDfmIgoGXViCxx20yBAM7QBqeK';
        $valid=password_verify($password,$account['passwordHash']??$dummy);
        if (!$account || !$valid) { rate($bucket,5,300); fail(401,'INVALID_CREDENTIALS','Email atau password salah'); }
        clearRate($bucket);
        $token=bin2hex(random_bytes(32));
        create('Session',['token'=>$token,'userId'=>$account['id'],'expiresAt'=>gmdate('Y-m-d\TH:i:s.000\Z',time()+604800)]);
        $user=publicUser($account); audit(null,'LOGIN','User',$account['id']);
        cookie($token,time()+604800); respond(['user'=>publicUser($account),'token'=>$token]);
    }
    if ($resource==='logout' && $method==='POST') {
        $token=$_COOKIE['kd_cms_session'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
        sql('DELETE FROM `Session` WHERE `token`=?',[$token]); cookie('',time()-3600); respond(['success'=>true]);
    }
    $user=sessionUser();
    if (!$user) fail(401,'UNAUTHORIZED','Sesi kedaluwarsa atau belum login');
    if (!in_array($user['role'],['ADMIN','MANAGER','EDITOR','PUBLISHER'],true)) fail(403,'FORBIDDEN','Peran tidak diizinkan');
    if ($resource==='me' && $method==='GET') respond($user);
    if ($resource==='calendar' && $method==='GET') calendar();
    $read=$method==='GET';
    if (in_array($resource,['users','backups','cron'],true) || ($resource==='sites' && !$read)) if ($user['role']!=='ADMIN') fail(403,'FORBIDDEN','Hanya admin pusat yang diizinkan');
    if ($resource==='users') {
        if ($read && !$id) respond(array_map('publicUser',rows('User','1=1',[],'`name` ASC')));
        if (($method==='POST'&&!$id)||($method==='PUT'&&$id)) userSave($id,$b);
    }
    if ($resource==='backups' && $id==='export' && $read) exportBackup();
    if ($resource==='cron' && $id==='publish' && $method==='POST') { $ids=publishDue(); respond(['publishedCount'=>count($ids),'postIds'=>$ids]); }
    if ($resource==='sites') {
        if ($read && !$id) {
            $all=rows('Site','1=1',[],'`createdAt` DESC'); $out=[];
            foreach ($all as $site) {
                if ($user['role']!=='ADMIN'&&!in_array($site['id'],$user['siteIds'],true)) continue;
                $site=sanitizeSite($site); $site['_count']=[];
                foreach (['pages'=>'Page','posts'=>'Post','categories'=>'Category','tags'=>'Tag','media'=>'Media'] as $key=>$table) $site['_count'][$key]=(int)sql("SELECT COUNT(*) FROM `$table` WHERE `siteId`=?",[$site['id']])->fetchColumn();
                $out[]=$site;
            }
            respond($out);
        }
        if ($id) get('Site',$id,true);
        if ($method==='POST'&&!$id) {
            $data=siteInput($b,false); $key=keyData(); $site=create('Site',array_merge($data,array_diff_key($key,['generatedApiKey'=>1])));
            create('SiteSetting',['siteId'=>$site['id'],'siteTitle'=>$site['name']]); audit($site['id'],'CREATE','Site',$site['id']);
            respond([...sanitizeSite($site),'generatedApiKey'=>$key['generatedApiKey']],201);
        }
        if ($method==='PUT'&&$id&&!$action) { $saved=update('Site',$id,siteInput($b,true)); audit($id,'UPDATE','Site',$id); respond(sanitizeSite($saved)); }
        if ($method==='POST'&&$id&&$action==='regenerate-api-key') {
            $key=keyData(); $saved=update('Site',$id,array_diff_key($key,['generatedApiKey'=>1])); audit($id,'REGENERATE_API_KEY','Site',$id);
            respond([...sanitizeSite($saved),'generatedApiKey'=>$key['generatedApiKey']]);
        }
        if ($method==='DELETE'&&$id&&!$action) {
            // Serialize count/delete to preserve the final site under concurrent requests.
            sql('SELECT `id` FROM `Site` FOR UPDATE')->fetchAll();
            if ((int)sql('SELECT COUNT(*) FROM `Site`')->fetchColumn()<=1) fail(400,'MIN_ONE_SITE','Minimal satu situs harus tersisa');
            remove('Site',$id); audit(null,'DELETE','Site',$id); respond(['success'=>true]);
        }
        fail(404,'NOT_FOUND','Endpoint tidak ditemukan');
    }
    $mapping=['pages'=>'Page','posts'=>'Post','categories'=>'Category','tags'=>'Tag','media'=>'Media','menus'=>'Menu'];
    if (!isset($mapping[$resource])&&!in_array($resource,['settings','audit-logs','versions'],true)) fail(404,'NOT_FOUND','Endpoint tidak ditemukan');
    if (in_array($resource,['menus','settings','audit-logs'],true)&&!manager()) fail(403,'FORBIDDEN','Akses pengelola situs diperlukan');
    if ($resource==='versions') {
        if ($read&&$id&&$action&&in_array(strtoupper($id),['PAGE','POST'],true)) {
            $table=strtoupper($id)==='PAGE'?'Page':'Post'; $record=get($table,$action); accessSite($record['siteId']);
            respond(rows('ContentVersion','`entityType`=? AND `entityId`=?',[strtoupper($id),$action],'`versionNumber` DESC'));
        }
        if ($method==='POST'&&$id&&$action==='restore') {
            $version=get('ContentVersion',$id); $table=$version['entityType']==='PAGE'?'Page':($version['entityType']==='POST'?'Post':null);
            if (!$table) fail(400,'CANNOT_RESTORE','Versi tidak valid');
            $record=get($table,$version['entityId'],true); accessSite($record['siteId']); editable($record);
            $snapshot=json_decode($version['snapshotData'],true,512,JSON_THROW_ON_ERROR);
            $data=array_intersect_key($snapshot,array_flip(['title','excerpt','contentHtml','contentJson','featuredImage','metaTitle','metaDescription']));
            $data['contentHtml']=cleanHtml($data['contentHtml']??''); snapshot($table,$record); $saved=update($table,$record['id'],$data);
            audit($record['siteId'],'RESTORE_VERSION',$table,$record['id'],['restoredVersion'=>$version['versionNumber']]); respond($saved);
        }
        fail(404,'NOT_FOUND','Versi tidak ditemukan');
    }
    $table=$mapping[$resource] ?? null;
    $record=($table&&$id&&!($resource==='media'&&$id==='upload'))?get($table,$id,!$read):null;
    $siteId=$record?$record['siteId']:($_GET['siteId']??null);
    if ($siteId!==null&&!is_string($siteId)) fail(400,'INVALID_SITE','Situs tidak valid');
    accessSite($siteId);
    if ($resource==='audit-logs'&&$read) {
        $page=max(1,(int)($_GET['page']??1)); $perPage=min(100,max(1,(int)($_GET['perPage']??25))); $where='1=1'; $params=[];
        if ($siteId) { $where.=' AND `siteId`=?'; $params[]=$siteId; }
        if (isset($_GET['action'])) { $where.=' AND `action`=?'; $params[]=text($_GET,'action'); }
        $total=(int)sql("SELECT COUNT(*) FROM `AuditLog` WHERE $where",$params)->fetchColumn();
        respond(rows('AuditLog',$where,$params,'`createdAt` DESC LIMIT '.$perPage.' OFFSET '.(($page-1)*$perPage)),200,['page'=>$page,'perPage'=>$perPage,'total'=>$total,'totalPages'=>(int)ceil($total/$perPage)]);
    }
    if ($resource==='settings') {
        if (!$siteId) fail(400,'SITE_REQUIRED','Pilih situs dahulu');
        $setting=first('SiteSetting','`siteId`=?',[$siteId]);
        if ($read) respond($setting);
        if ($method==='PUT') {
            $data=['siteTitle'=>text($b,'siteTitle','',1)];
            foreach (['tagline','logoUrl','faviconUrl','contactEmail','contactPhone','footerText'] as $key) $data[$key]=text($b,$key);
            foreach (['socialLinks','customMetadata'] as $key) $data[$key]=jsonText($b,$key,'{}');
            if ($data['contactEmail']&&!filter_var($data['contactEmail'],FILTER_VALIDATE_EMAIL)) fail(400,'VALIDATION_ERROR','Email tidak valid');
            $saved=$setting?update('SiteSetting',$setting['id'],$data):create('SiteSetting',['siteId'=>$siteId,...$data]);
            audit($siteId,'UPDATE','Setting',$saved['id']); respond($saved);
        }
    }
    if (!$table) fail(404,'NOT_FOUND','Endpoint tidak ditemukan');
    if (in_array($table,['Page','Post'],true)&&$record&&$action==='review') review($table,$record,$b,$method);
    if ($action) fail(404,'NOT_FOUND','Endpoint tidak ditemukan');
    if ($table==='Media'&&$id==='upload'&&$method==='POST') uploadMedia($siteId);
    if ($read&&!$id) {
        if (!$siteId&&$table!=='Media') fail(400,'SITE_REQUIRED','Pilih situs dahulu');
        $where=$siteId?'`siteId`=?':'1=1'; $params=$siteId?[$siteId]:[];
        if ($table==='Media'&&$siteId&&$user['role']==='ADMIN') $where='(`siteId`=? OR `siteId` IS NULL)';
        $order=in_array($table,['Category','Tag'],true)?'`name` ASC':($table==='Menu'?'`createdAt` ASC':'`createdAt` DESC');
        $result=rows($table,$where,$params,$order);
        if ($table==='Post') $result=array_map('enrichPost',$result);
        if ($table==='Category'||$table==='Tag') foreach ($result as &$row) $row['_count']=['posts'=>(int)sql($table==='Category'?'SELECT COUNT(*) FROM `Post` WHERE `categoryId`=?':'SELECT COUNT(*) FROM `PostTag` WHERE `tagId`=?',[$row['id']])->fetchColumn()];
        respond($result);
    }
    if ($method==='DELETE'&&$record) {
        if (in_array($table,['Page','Post'],true)) editable($record);
        remove($table,$id); audit($siteId,'DELETE',$table,$id);
        if ($table==='Media') { global $deleteFiles; $deleteFiles[]=dirname(__DIR__).'/uploads/'.basename($record['filename']); }
        if (in_array($table,['Page','Post'],true)) webhook($siteId,strtolower($table).'.deleted',$table,$id,['slug'=>$record['slug']]);
        respond(['success'=>true]);
    }
    if (!(($method==='POST'&&!$id)||($method==='PUT'&&$record))) fail(405,'METHOD_NOT_ALLOWED','Metode tidak tersedia');
    if (in_array($table,['Page','Post'],true)) {
        if ($record) editable($record); elseif (!$siteId) fail(400,'SITE_REQUIRED','Pilih situs dahulu');
        $data=contentInput($table,$b,$siteId);
        $data['publishedAt']=$data['status']==='PUBLISHED'?($record['publishedAt']??now()):($record['publishedAt']??null);
        if ($record) snapshot($table,$record);
    } elseif ($table==='Category'||$table==='Tag') {
        $data=['name'=>text($b,'name','',1),'slug'=>slug($b)];
        if ($table==='Category') $data['description']=text($b,'description');
    } elseif ($table==='Menu') {
        $data=['name'=>text($b,'name','',1),'location'=>text($b,'location','HEADER'),'itemsJson'=>jsonText($b,'itemsJson','[]')];
        if (!in_array($data['location'],['HEADER','FOOTER','SIDEBAR'],true)) fail(400,'VALIDATION_ERROR','Lokasi menu tidak valid');
        $items=json_decode($data['itemsJson'],true);
        $check=function($items,int $depth=0) use (&$check):void {
            if (!is_array($items)||!array_is_list($items)||$depth>20) fail(400,'VALIDATION_ERROR','Struktur menu tidak valid');
            foreach ($items as $item) {
                if (!is_array($item)||!is_string($item['label']??null)||!is_string($item['url']??null)||!safeUrl($item['url'])) fail(400,'VALIDATION_ERROR','Item atau URL menu tidak valid');
                if (isset($item['children'])) $check($item['children'],$depth+1);
            }
        }; $check($items);
    } elseif ($table==='Media'&&$record) $data=['altText'=>text($b,'altText'),'caption'=>text($b,'caption')];
    else fail(405,'METHOD_NOT_ALLOWED','Metode tidak tersedia');
    if (!$record&&!$siteId) fail(400,'SITE_REQUIRED','Pilih situs dahulu');
    $saved=$record?update($table,$id,$data):create($table,['siteId'=>$siteId,...$data]);
    if ($table==='Post') { saveTags($saved['id'],$b); $saved=enrichPost($saved); }
    audit($siteId,$record?'UPDATE':'CREATE',$table,$saved['id']);
    if (in_array($table,['Page','Post'],true)) webhook($siteId,strtolower($table).($saved['status']==='PUBLISHED'?'.published':'.updated'),$table,$saved['id'],['title'=>$saved['title'],'slug'=>$saved['slug']]);
    respond($saved,$record?200:201);
}
