<?php
// Router khusus pengujian lokal: php -S 127.0.0.1:3080 -t htdocs router.php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('~^/cms-private(?:/|$)|/\.|\.(?:db|sqlite|sql|log|bak)$~i', $path)) {
    http_response_code(403); exit;
}
$file = __DIR__ . '/htdocs' . $path;
if ($path !== '/' && is_file($file) && !preg_match('~^/uploads/.*\.(?:php\d?|phtml|phar|html?|svg|js)$~i', $path)) return false;
require __DIR__ . '/htdocs/index.php';
