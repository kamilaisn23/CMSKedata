<?php
if (PHP_SAPI !== 'cli') exit;
$zip = new ZipArchive();
if ($zip->open($argv[2], ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) throw new RuntimeException('Cannot create release ZIP');
$root = rtrim($argv[1], '/\\');
foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {
    if ($file->isFile()) $zip->addFile($file->getPathname(), str_replace('\\', '/', substr($file->getPathname(), strlen($root) + 1)));
}
if (!$zip->close()) throw new RuntimeException('Cannot finish release ZIP');
