<?php
declare(strict_types=1);

function exportBackup(): never {
    global $pdo,$models;
    if (!class_exists('ZipArchive')) fail(503,'ZIP_UNAVAILABLE','Gunakan phpMyAdmin Export dan unduh uploads melalui FTP');
    $pdo->beginTransaction();
    sql('SELECT `id` FROM `CmsLock` WHERE `id`=1 FOR UPDATE')->fetch();
    $temp=tempnam(sys_get_temp_dir(),'kdbackup-');
    if (!$temp) fail(500,'BACKUP_ERROR','Penyimpanan sementara tidak tersedia');
    $sqlTemp=tempnam(sys_get_temp_dir(),'kdsql-');
    $zip=new ZipArchive();
    try {
        if (!$sqlTemp||$zip->open($temp,ZipArchive::OVERWRITE)!==true) throw new RuntimeException('Backup allocation failed');
        $stream=fopen($sqlTemp,'wb');
        if (!$stream) throw new RuntimeException('Cannot write SQL');
        fwrite($stream,"-- PRIVATE Kedata CMS MySQL backup. Import into a NEW database after schema.sql.\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSTART TRANSACTION;\n");
        foreach (array_keys($models) as $table) {
            if ($table==='Session') continue;
            $stmt=sql("SELECT * FROM `$table`");
            while ($row=$stmt->fetch()) {
                $line="INSERT INTO `$table` (`".implode('`,`',array_keys($row)).'`) VALUES ('.implode(',',array_map(fn($value)=>$value===null?'NULL':($value===''?"''":'CONVERT(0x'.bin2hex((string)$value).' USING utf8mb4)'),array_values($row))).");\n";
                if (fwrite($stream,$line)===false) throw new RuntimeException('Backup storage full');
            }
        }
        fwrite($stream,"COMMIT;\nSET FOREIGN_KEY_CHECKS=1;\n"); fclose($stream);
        $zip->addFile($sqlTemp,'data.sql');
        $zip->addFromString('schema.sql',require __DIR__.'/schema.php');
        foreach (sql('SELECT `filename`,`url` FROM `Media`')->fetchAll() as $media) {
            if (!str_starts_with($media['url'],'/uploads/')) continue;
            $name=$media['filename'];
            if (basename($name)!==$name) throw new RuntimeException('Unsafe filename');
            $file=dirname(__DIR__).'/uploads/'.$name;
            if (is_link($file)||!is_file($file)) throw new RuntimeException('Referenced media missing');
            $zip->addFile($file,'uploads/'.$name);
        }
        $zip->addFromString('RESTORE.txt',"PRIVATE BACKUP\nBuat database MySQL kosong, import schema.sql lalu data.sql melalui phpMyAdmin. Salin uploads melalui FTP. Sesuaikan config.php lalu login kembali. Sesi tidak disertakan. Jangan upload SQL atau ZIP ini ke htdocs.\n");
        if (!$zip->close()) throw new RuntimeException('Cannot finish ZIP');
        audit(null,'EXPORT_BACKUP','Backup',null);
        if ($pdo->inTransaction()) $pdo->commit();
        header('Content-Type: application/zip'); header('Cache-Control: no-store');
        header('Content-Disposition: attachment; filename="kedata-mysql-'.gmdate('Ymd-His').'.zip"');
        header('Content-Length: '.filesize($temp)); readfile($temp);
    } finally {
        if (is_file($temp)) unlink($temp);
        if ($sqlTemp&&is_file($sqlTemp)) unlink($sqlTemp);
    }
    exit;
}
