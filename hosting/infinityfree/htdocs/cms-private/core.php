<?php
declare(strict_types=1);

final class HttpResult extends Exception {
    public function __construct(public mixed $payload, public int $status = 200) { parent::__construct(); }
}
function fail(int $status, string $code, string $message): never {
    throw new HttpResult(['data' => null, 'meta' => null, 'error' => ['code' => $code, 'message' => $message]], $status);
}
function respond(mixed $data, int $status = 200, mixed $meta = null): never {
    throw new HttpResult(['data' => $data, 'meta' => $meta, 'error' => null], $status);
}
function now(): string { return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'); }
function uid(): string { return 'c' . bin2hex(random_bytes(12)); }
function sql(string $query, array $params = []): PDOStatement {
    global $pdo;
    $stmt = $pdo->prepare($query); $stmt->execute($params); return $stmt;
}
function model(string $table): array {
    global $models;
    if (!isset($models[$table])) throw new LogicException('Unknown model');
    return $models[$table];
}
function fields(string $table): array { return array_column(model($table), 'name'); }
function rows(string $table, string $where = '1=1', array $params = [], string $order = ''): array {
    model($table);
    $result = sql("SELECT * FROM `$table` WHERE $where" . ($order ? " ORDER BY $order" : ''), $params)->fetchAll();
    foreach ($result as &$row) foreach (model($table) as $f) if ($f['type'] === 'Int' && $row[$f['name']] !== null) $row[$f['name']] = (int)$row[$f['name']];
    return $result;
}
function first(string $table, string $where, array $params = [], bool $lock = false): ?array {
    model($table);
    // SELECT FOR UPDATE serializes writes/review snapshots on the same record.
    $row = sql("SELECT * FROM `$table` WHERE $where LIMIT 1" . ($lock ? ' FOR UPDATE' : ''), $params)->fetch();
    if (!$row) return null;
    foreach (model($table) as $f) if ($f['type'] === 'Int' && $row[$f['name']] !== null) $row[$f['name']] = (int)$row[$f['name']];
    return $row;
}
function get(string $table, string $id, bool $lock = false): array {
    return first($table, '`id`=?', [$id], $lock) ?? fail(404, 'NOT_FOUND', 'Data tidak ditemukan');
}
function create(string $table, array $values): array {
    $data = [];
    foreach (model($table) as $f) {
        $name = $f['name'];
        if (array_key_exists($name, $values)) $data[$name] = $values[$name];
        elseif ($name === 'id') $data[$name] = uid();
        elseif ($f['updated'] || $name === 'createdAt') $data[$name] = now();
        elseif ($f['default'] !== null && !is_array($f['default'])) $data[$name] = $f['default'];
        elseif (!$f['required']) $data[$name] = null;
        else throw new LogicException("Required field $table.$name");
    }
    $keys = array_keys($data);
    sql("INSERT INTO `$table` (`" . implode('`,`', $keys) . '`) VALUES (' . implode(',', array_fill(0, count($keys), '?')) . ')', array_values($data));
    return $data;
}
function update(string $table, string $id, array $values): array {
    $data = array_intersect_key($values, array_flip(fields($table)));
    unset($data['id'], $data['createdAt']);
    if (in_array('updatedAt', fields($table), true)) $data['updatedAt'] = now();
    if ($data) sql("UPDATE `$table` SET " . implode(',', array_map(fn($k) => "`$k`=?", array_keys($data))) . ' WHERE `id`=?', [...array_values($data), $id]);
    return get($table, $id);
}
function remove(string $table, string $id): void { model($table); sql("DELETE FROM `$table` WHERE `id`=?", [$id]); }
function text(array $input, string $key, string $default = '', int $min = 0, ?int $max = null): string {
    $v = $input[$key] ?? $default;
    if (!is_string($v) || mb_strlen($v) < $min || ($max !== null && mb_strlen($v) > $max)) fail(400, 'VALIDATION_ERROR', "Periksa isian $key");
    return $v;
}
function slug(array $input): string {
    $v = text($input, 'slug', '', 1, 191);
    if (!preg_match('/^[a-z0-9-]+$/D', $v)) fail(400, 'VALIDATION_ERROR', 'Slug hanya huruf kecil, angka, dan strip');
    return $v;
}
function jsonText(array $input, string $key, string $default): string {
    $v = text($input, $key, $default);
    try { json_decode($v, true, 512, JSON_THROW_ON_ERROR); } catch (JsonException) { fail(400, 'VALIDATION_ERROR', "$key harus berupa JSON valid"); }
    return $v;
}
function dateText(mixed $value): ?string {
    if ($value === null || $value === '') return null;
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T/', $value)) fail(400, 'VALIDATION_ERROR', 'Tanggal tidak valid');
    try { return (new DateTimeImmutable($value))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z'); }
    catch (Exception) { fail(400, 'VALIDATION_ERROR', 'Tanggal tidak valid'); }
}
function safeUrl(string $value, bool $image = false): bool {
    $v = preg_replace('/[\x00-\x20\x7f]+/', '', html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    if (str_contains($v, '\\') || str_starts_with($v, '//')) return false;
    return !preg_match('/^[a-z][a-z0-9+.-]*:/i', $v) || (bool)preg_match($image ? '~^https?://~i' : '~^(https?://|mailto:|tel:)~i', $v);
}
function cleanHtml(string $html): string {
    if ($html === '') return '';
    $dom = new DOMDocument();
    $previous = libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8"><html><body>' . $html . '</body></html>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors(); libxml_use_internal_errors($previous);
    $allowed = explode(' ', 'h1 h2 h3 h4 h5 h6 blockquote p a ul ol li b i strong em strike s code hr br div table thead tbody tr th td pre img span figure figcaption');
    $walk = function (DOMNode $node) use (&$walk, $allowed): void {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMComment || $child instanceof DOMProcessingInstruction) { $node->removeChild($child); continue; }
            if (!$child instanceof DOMElement) continue;
            $tag = strtolower($child->tagName);
            if (in_array($tag, ['script','style','iframe','object','embed','svg','math','template','form','input','button','meta','link','base'], true)) { $node->removeChild($child); continue; }
            $walk($child);
            if (!in_array($tag, $allowed, true)) {
                while ($child->firstChild) $node->insertBefore($child->firstChild, $child);
                $node->removeChild($child); continue;
            }
            foreach (iterator_to_array($child->attributes) as $attr) {
                $name = strtolower($attr->name); $val = $attr->value;
                $ok = in_array($name, ['class','id','title'], true)
                    || ($tag === 'a' && in_array($name, ['href','target','rel','name'], true))
                    || ($tag === 'img' && in_array($name, ['src','alt','width','height','loading'], true));
                if (in_array($name, ['href','src'], true) && !safeUrl($val, $name === 'src')) $ok = false;
                if ($name === 'style') {
                    $styles = [];
                    foreach (explode(';', $val) as $declaration) if (preg_match('/^\s*(text-align|color|background-color)\s*:\s*([a-zA-Z0-9#(),.%\s-]+)$/D', $declaration, $m)) $styles[] = $m[1] . ':' . $m[2];
                    if ($styles) { $child->setAttribute('style', implode(';', $styles)); continue; }
                }
                if (!$ok) $child->removeAttribute($attr->name);
            }
            if ($tag === 'a' && $child->getAttribute('target') === '_blank') $child->setAttribute('rel', 'noopener noreferrer');
        }
    };
    $body = $dom->getElementsByTagName('body')->item(0);
    if (!$body) return '';
    $walk($body); $out = '';
    foreach ($body->childNodes as $child) $out .= $dom->saveHTML($child);
    return $out;
}
function publicUser(array $user): array {
    return ['id' => $user['id'], 'email' => $user['email'], 'name' => $user['name'], 'role' => $user['role'],
        'siteIds' => array_column(rows('SiteMembership', '`userId`=?', [$user['id']]), 'siteId')];
}
function sessionUser(): ?array {
    $token = $_COOKIE['kd_cms_session'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if (!is_string($token) || !$token) return null;
    $s = first('Session', '`token`=? AND `expiresAt`>?', [$token, now()]);
    if (!$s) return null;
    $u = first('User', '`id`=?', [$s['userId']]);
    return $u ? publicUser($u) : null;
}
function cookie(string $value, int $expires): void {
    global $config;
    setcookie('kd_cms_session', $value, ['expires' => $expires, 'path' => '/', 'secure' => $config['secure_cookies'], 'httponly' => true, 'samesite' => 'Lax']);
}
function manager(): bool { global $user; return in_array($user['role'], ['ADMIN','MANAGER'], true); }
function publisher(): bool { global $user; return in_array($user['role'], ['ADMIN','MANAGER','PUBLISHER'], true); }
function accessSite(?string $id): void {
    global $user;
    if ($user['role'] !== 'ADMIN' && (!$id || !in_array($id, $user['siteIds'], true))) fail(403, 'FORBIDDEN', 'Situs tidak diizinkan');
    if ($id) get('Site', $id);
}
function editable(array $record): void {
    global $user;
    if ($record['status'] === 'IN_REVIEW' || (!publisher() && ($user['role'] !== 'EDITOR' || $record['status'] !== 'DRAFT'))) fail(409, 'CONTENT_CONFLICT', 'Konten berubah atau sedang direview. Muat ulang daftar.');
}
function audit(?string $siteId, string $action, string $type, ?string $id, array $details = []): void {
    global $user;
    create('AuditLog', ['siteId' => $siteId, 'actor' => $user['email'] ?? 'system', 'action' => $action, 'entityType' => $type, 'entityId' => $id, 'details' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'ipAddress' => $_SERVER['REMOTE_ADDR'] ?? null]);
}
function snapshot(string $table, array $record): void {
    global $user;
    $version = (int)sql('SELECT COALESCE(MAX(`versionNumber`),0)+1 FROM `ContentVersion` WHERE `entityType`=? AND `entityId`=?', [strtoupper($table), $record['id']])->fetchColumn();
    create('ContentVersion', ['entityType' => strtoupper($table), 'entityId' => $record['id'], 'versionNumber' => $version,
        'title' => $record['title'], 'contentHtml' => $record['contentHtml'], 'contentJson' => $record['contentJson'],
        'snapshotData' => json_encode($record, JSON_THROW_ON_ERROR), 'createdBy' => $user['email']]);
}
function sanitizeSite(array $site): array { $site['hasWebhookSecret']=(bool)$site['webhookSecret']; unset($site['apiKeyHash'], $site['webhookSecret']); return $site; }
function keyData(): array {
    $key = 'kd_live_' . bin2hex(random_bytes(24));
    return ['generatedApiKey' => $key, 'apiKeyHash' => hash('sha256', $key), 'apiKeyPrefix' => substr($key, 0, 12) . '...'];
}
function enrichPost(array $post): array {
    $post['category'] = $post['categoryId'] ? first('Category', '`id`=? AND `siteId`=?', [$post['categoryId'], $post['siteId']]) : null;
    $post['tags'] = array_map(function ($link) { $link['tag'] = get('Tag', $link['tagId']); return $link; }, rows('PostTag', '`postId`=?', [$post['id']]));
    return $post;
}
function rateConnection(): PDO {
    global $config,$dsn;
    static $ratePdo=null;
    if (!$ratePdo) $ratePdo=new PDO($dsn,$config['db_user'],$config['db_password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
    return $ratePdo;
}
function clearRate(string $bucket): void { $stmt=rateConnection()->prepare('DELETE FROM `CmsRate` WHERE `bucket`=?'); $stmt->execute([hash('sha256',$bucket)]); }
function rate(string $bucket, int $limit, int $seconds, bool $consume = true): void {
    $ratePdo=rateConnection();
    $bucket = hash('sha256', $bucket); $expires = time() + $seconds;
    // Atomic counter also works across separate PHP processes.
    if ($consume) {
        $stmt=$ratePdo->prepare('INSERT INTO `CmsRate` (`bucket`,`hits`,`expires`) VALUES (?,1,?) ON DUPLICATE KEY UPDATE `hits`=IF(`expires`<?,1,`hits`+1), `expires`=IF(`expires`<?,?,`expires`)');
        $stmt->execute([$bucket,$expires,time(),time(),$expires]);
    }
    $stmt=$ratePdo->prepare('SELECT `hits`,`expires` FROM `CmsRate` WHERE `bucket`=?'); $stmt->execute([$bucket]); $row=$stmt->fetch();
    if ($row&&(int)$row['expires']>time()&&($consume?(int)$row['hits']>$limit:(int)$row['hits']>=$limit)) { header('Retry-After: ' . max(1, (int)$row['expires'] - time())); fail(429, 'RATE_LIMIT_EXCEEDED', 'Terlalu banyak permintaan. Coba beberapa saat lagi.'); }
    if ($consume&&str_starts_with($_SERVER['REQUEST_URI']??'','/api/v1')) {
        header('X-RateLimit-Remaining: '.max(0,$limit-(int)$row['hits'])); header('X-RateLimit-Reset: '.max(0,(int)$row['expires']-time()));
    }
    if (random_int(1,100) === 1) { $stmt=$ratePdo->prepare('DELETE FROM `CmsRate` WHERE `expires`<? AND `bucket`<>?'); $stmt->execute([time(),'setup-lock']); }
}
function publishDue(?string $siteId = null): array {
    $where = '`status`=? AND `scheduledAt`<=?'; $params = ['SCHEDULED', now()];
    if ($siteId) { $where .= ' AND `siteId`=?'; $params[] = $siteId; }
    $posts = rows('Post', $where, $params);
    foreach ($posts as $post) sql('UPDATE `Post` SET `status`=?,`publishedAt`=?,`updatedAt`=? WHERE `id`=? AND `status`=? AND `scheduledAt`<=?', ['PUBLISHED',now(),now(),$post['id'],'SCHEDULED',now()]);
    return array_column($posts, 'id');
}
function webhook(string $siteId, string $event, string $entity, string $id, array $data): void {
    global $webhooks;
    $webhooks[] = [$siteId,$event,$entity,$id,$data];
}
function deliverWebhooks(): void {
    global $webhooks;
    foreach ($webhooks as [$siteId,$event,$entity,$id,$data]) {
        try {
            $site = get('Site', $siteId); $url = $site['webhookUrl'];
            if (!$url) continue;
            $parts = parse_url($url);
            if (!$parts || !in_array($parts['scheme'] ?? '', ['http','https'], true) || isset($parts['user']) || isset($parts['pass'])) continue;
            $host = $parts['host']; $port = $parts['port'] ?? ($parts['scheme'] === 'https' ? 443 : 80);
            if (!in_array($port, [80,443], true)) continue;
            $ip = gethostbyname($host);
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) continue;
            $body = json_encode(['event'=>$event,'timestamp'=>now(),'siteSlug'=>$site['slug'],'siteId'=>$siteId,'entityType'=>$entity,'entityId'=>$id,'data'=>$data], JSON_THROW_ON_ERROR);
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,
                CURLOPT_TIMEOUT=>3,CURLOPT_CONNECTTIMEOUT=>2,CURLOPT_PROTOCOLS=>CURLPROTO_HTTP | CURLPROTO_HTTPS,
                CURLOPT_RESOLVE=>["$host:$port:$ip"],CURLOPT_HTTPHEADER=>['Content-Type: application/json','User-Agent: Kedata-CMS-Webhook/1.0','X-Kedata-Event: '.$event,'X-Kedata-Signature: '.($site['webhookSecret']?'sha256='.hash_hmac('sha256',$body,$site['webhookSecret']):'')]]);
            $result=curl_exec($ch); $status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE); curl_close($ch);
            audit($siteId,$result!==false?'WEBHOOK_DELIVERED':'WEBHOOK_FAILED','Webhook',$id,['status'=>$status,'event'=>$event]);
        } catch (Throwable) { error_log('Kedata webhook delivery failed'); }
    }
}
