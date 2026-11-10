<?php
declare(strict_types=1);

function cached(mixed $data, mixed $meta = null, bool $private = false): never {
    $payload=['data'=>$data,'meta'=>$meta,'error'=>null];
    $etag='"'.hash('sha256',json_encode($payload,JSON_THROW_ON_ERROR)).'"';
    header('ETag: '.$etag); header('Vary: Origin, x-api-key');
    header('Cache-Control: '.($private?'private, no-store':'private, max-age=60, stale-while-revalidate=300'));
    if (($_SERVER['HTTP_IF_NONE_MATCH']??'')===$etag) throw new HttpResult(null,304);
    throw new HttpResult($payload);
}
function contentPublic(string $table, array $row, bool $single): array {
    $keys=['id','title','slug','contentHtml','contentJson','metaTitle','metaDescription','ogImage','publishedAt','createdAt','updatedAt'];
    if ($table==='Post') $keys=[...$keys,'excerpt','featuredImage'];
    if ($single) $keys[]='status';
    $out=array_intersect_key($row,array_flip($keys));
    try { $out['contentJson']=json_decode($row['contentJson'],false,512,JSON_THROW_ON_ERROR); } catch (Throwable) { $out['contentJson']=(object)[]; }
    if ($table==='Post') {
        $post=enrichPost($row); $category=$post['category'];
        $out['category']=$category?array_intersect_key($category,array_flip(['id','name','slug'])):null;
        $out['tags']=array_map(fn($link)=>array_intersect_key($link['tag'],array_flip(['id','name','slug'])),$post['tags']);
    }
    $fields=isset($_GET['fields'])?array_filter(array_map('trim',explode(',',text($_GET,'fields')))):[];
    if ($fields) $out=array_intersect_key($out,array_flip($fields));
    return $out ?: (array)[];
}
function publicApi(array $parts, string $method): never {
    global $user;
    $origin=$_SERVER['HTTP_ORIGIN']??null;
    // Preflight has no API key header value. Actual GET still verifies the key and origin.
    if ($method==='OPTIONS') {
        if ($origin) { header('Access-Control-Allow-Origin: '.$origin); header('Vary: Origin'); }
        header('Access-Control-Allow-Methods: GET, OPTIONS'); header('Access-Control-Allow-Headers: Content-Type, x-api-key, if-none-match');
        throw new HttpResult(null,204);
    }
    if ($method!=='GET') fail(405,'METHOD_NOT_ALLOWED','API publik hanya mendukung GET');
    $key=$_SERVER['HTTP_X_API_KEY']??($_GET['apiKey']??'');
    if (!is_string($key)||!$key) fail(401,'UNAUTHORIZED','API key diperlukan');
    $site=first('Site','`apiKeyHash`=?',[hash('sha256',$key)]);
    if (!$site) {
        $user=sessionUser();
        if ($user&&manager()) {
            $candidate=first('Site','`slug`=? OR `apiKeyPrefix`=?',[$key,$key]);
            if ($candidate&&($user['role']==='ADMIN'||in_array($candidate['id'],$user['siteIds'],true))) $site=$candidate;
        }
    }
    if (!$site) fail(401,'INVALID_API_KEY','API key tidak valid');
    if ($origin) {
        $allowed=false;
        foreach (explode(',',$site['corsOrigins']) as $pattern) {
            $pattern=trim($pattern);
            if ($pattern==='*'||preg_match('~^'.str_replace('\\*','.*',preg_quote($pattern,'~')).'$~D',$origin)) { $allowed=true; break; }
        }
        if (!$allowed) fail(403,'ORIGIN_FORBIDDEN','Origin tidak diizinkan');
        header('Access-Control-Allow-Origin: '.$origin);
    }
    rate('site:'.$site['id'],(int)$site['rateLimit'],60);
    header('X-RateLimit-Limit: '.$site['rateLimit']);
    publishDue($site['id']);
    [$resource,$id]=array_pad($parts,2,null); $siteId=$site['id'];
    if (in_array($resource,['pages','posts'],true)) {
        $table=$resource==='pages'?'Page':'Post';
        if ($id) {
            $row=first($table,'`siteId`=? AND `slug`=?',[$siteId,$id]);
            if (!$row) fail(404,strtoupper($table).'_NOT_FOUND','Konten tidak ditemukan');
            $private=false;
            if ($row['status']!=='PUBLISHED') {
                // A site-derived string is not sufficient to disclose a draft.
                $user=sessionUser();
                if (!$user||!publisher()||($user['role']!=='ADMIN'&&!in_array($siteId,$user['siteIds'],true))||($_GET['preview']??'')!=='kd_preview_'.$siteId) fail(404,strtoupper($table).'_NOT_PUBLISHED','Konten belum dipublikasikan');
                $private=true;
            }
            cached(contentPublic($table,$row,true),null,$private);
        }
        $page=max(1,(int)($_GET['page']??1)); $perPage=min(100,max(1,(int)($_GET['perPage']??($table==='Post'?10:20))));
        $where='`siteId`=? AND `status`=?'; $params=[$siteId,'PUBLISHED'];
        if ($table==='Post') {
            if (isset($_GET['search'])&&$_GET['search']!=='') { $where.=' AND (`title` LIKE ? OR `excerpt` LIKE ? OR `contentHtml` LIKE ?)'; $s='%'.text($_GET,'search').'%'; array_push($params,$s,$s,$s); }
            if (isset($_GET['category'])&&$_GET['category']!=='') { $where.=' AND `categoryId` IN (SELECT `id` FROM `Category` WHERE `siteId`=? AND `slug`=?)'; array_push($params,$siteId,text($_GET,'category')); }
            if (isset($_GET['tag'])&&$_GET['tag']!=='') { $where.=' AND `id` IN (SELECT pt.`postId` FROM `PostTag` pt JOIN `Tag` t ON t.`id`=pt.`tagId` WHERE t.`siteId`=? AND t.`slug`=?)'; array_push($params,$siteId,text($_GET,'tag')); }
        }
        $sort=$table==='Post'?($_GET['sort']??'publishedAt'):'createdAt';
        if (!in_array($sort,['publishedAt','createdAt','title'],true)) $sort='publishedAt';
        $order=($_GET['order']??'desc')==='asc'?'ASC':'DESC';
        $total=(int)sql("SELECT COUNT(*) FROM `$table` WHERE $where",$params)->fetchColumn();
        $result=rows($table,$where,$params,"`$sort` $order, `id` ASC LIMIT $perPage OFFSET ".(($page-1)*$perPage));
        cached(array_map(fn($r)=>contentPublic($table,$r,false),$result),['page'=>$page,'perPage'=>$perPage,'total'=>$total,'totalPages'=>(int)ceil($total/$perPage)]);
    }
    if (($resource==='categories'||$resource==='tags')&&!$id) {
        $table=$resource==='categories'?'Category':'Tag'; $out=[];
        foreach (rows($table,'`siteId`=?',[$siteId],'`name` ASC') as $row) {
            $row['postCount']=(int)sql($table==='Category'?'SELECT COUNT(*) FROM `Post` WHERE `categoryId`=? AND `status`=\'PUBLISHED\'':'SELECT COUNT(*) FROM `PostTag` pt JOIN `Post` p ON p.`id`=pt.`postId` WHERE pt.`tagId`=? AND p.`status`=\'PUBLISHED\'',[$row['id']])->fetchColumn();
            $out[]=array_intersect_key($row,array_flip(['id','name','slug','description','postCount','createdAt']));
        }
        cached($out,['total'=>count($out)]);
    }
    if ($resource==='menus'&&!$id) {
        $where='`siteId`=?'; $params=[$siteId];
        if (isset($_GET['location'])) { $where.=' AND `location`=?'; $params[]=strtoupper(text($_GET,'location')); }
        $out=[];
        foreach (rows('Menu',$where,$params,'`createdAt` ASC') as $row) $out[]=['id'=>$row['id'],'name'=>$row['name'],'location'=>$row['location'],'items'=>json_decode($row['itemsJson'],true)??[],'updatedAt'=>$row['updatedAt']];
        cached($out,['total'=>count($out)]);
    }
    if ($resource==='settings'&&!$id) {
        $row=first('SiteSetting','`siteId`=?',[$siteId]);
        if (!$row) cached(['siteId'=>$siteId,'siteTitle'=>$site['name'],'tagline'=>$site['description'],'logoUrl'=>null,'faviconUrl'=>null,'contactEmail'=>null,'contactPhone'=>null,'socialLinks'=>(object)[],'footerText'=>null,'customMetadata'=>(object)[]]);
        unset($row['id']);
        foreach (['socialLinks','customMetadata'] as $key) $row[$key]=json_decode($row[$key])??(object)[];
        cached($row);
    }
    if ($resource==='media'&&$id) {
        $row=first('Media','`id`=? AND (`siteId`=? OR `siteId` IS NULL)',[$id,$siteId]);
        if (!$row) fail(404,'MEDIA_NOT_FOUND','Media tidak ditemukan');
        unset($row['siteId'],$row['updatedAt']); cached($row);
    }
    fail(404,'NOT_FOUND','Endpoint tidak ditemukan');
}
