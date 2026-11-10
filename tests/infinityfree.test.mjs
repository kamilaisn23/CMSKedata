// Isolated PHP + MySQL integration test. Does not use the project's .env/database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const root=process.cwd();
const mysqlBase=process.env.CSM_TEST_MYSQL_BASE || 'C:/laragon/bin/mysql/mysql-8.4.3-winx64';
const mysqlDir=path.resolve('.cache/infinityfree-mysql');
const testDir=path.resolve('.cache/infinityfree-http-'+Date.now());
const port=3317, httpPort=3087;
const dbName='csm_test_'+Date.now();
const php=(source)=>{
  const r=spawnSync('php',[],{input:'<?php\n'+source,encoding:'utf8',windowsHide:true});
  assert.equal(r.status,0,r.stderr||r.stdout); return r.stdout;
};
const connect=`$p=new PDO('mysql:host=127.0.0.1;port=${port};charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);`;
const base=`http://127.0.0.1:${httpPort}`;
const password='Local-test-password-2026';
let mysql,server,checks=0;
async function request(url,{method='GET',data,token,expected=200,body,headers={}}={}) {
  const response=await fetch(base+url,{method,headers:{...(token?{'x-admin-token':token}:{}),...(data?{'Content-Type':'application/json'}:{}),...headers},body:body||(data?JSON.stringify(data):undefined)});
  const type=response.headers.get('content-type')||'';
  const value=type.includes('json')?await response.json():Buffer.from(await response.arrayBuffer());
  assert.equal(response.status,expected,`${method} ${url}: ${JSON.stringify(value)}`); checks++;
  return {value,response};
}
try {
  fs.mkdirSync(mysqlDir,{recursive:true});
  if (!fs.existsSync(path.join(mysqlDir,'mysql'))) {
    const r=spawnSync(path.join(mysqlBase,'bin/mysqld.exe'),['--no-defaults','--initialize-insecure',`--basedir=${mysqlBase}`,`--datadir=${mysqlDir}`],{encoding:'utf8',windowsHide:true});
    assert.equal(r.status,0,r.stderr);
  }
  mysql=spawn(path.join(mysqlBase,'bin/mysqld.exe'),['--no-defaults',`--basedir=${mysqlBase}`,`--datadir=${mysqlDir}`,`--port=${port}`,'--bind-address=127.0.0.1','--mysqlx=OFF','--console'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  let mysqlLog=''; mysql.stderr.on('data',b=>{mysqlLog+=b.toString();}); mysql.stdout.on('data',()=>{});
  let ready=false;
  for (let i=0;i<80;i++) {
    await delay(100);
    const r=spawnSync('php',[],{input:'<?php try {'+connect+'} catch(Throwable $e) {exit(1);}',encoding:'utf8',windowsHide:true});
    if (r.status===0) {ready=true;break;}
    if (mysql.exitCode!==null) break;
  }
  assert(ready,'Isolated MySQL unavailable: '+mysqlLog);
  fs.mkdirSync(testDir,{recursive:true});
  fs.cpSync('artifacts/infinityfree/package/htdocs',path.join(testDir,'htdocs'),{recursive:true});
  fs.copyFileSync('hosting/infinityfree/router.php',path.join(testDir,'router.php'));
  const cfg={db_host:'127.0.0.1',db_port:port,db_name:dbName,db_user:'root',db_password:'',app_url:base,secure_cookies:false,setup_token:'local-setup-token-32-characters-long'};
  fs.writeFileSync(path.join(testDir,'htdocs/cms-private/config.php'),'<?php return json_decode('+JSON.stringify(JSON.stringify(cfg))+',true);');
  php(connect+`$p->exec('CREATE DATABASE ${dbName} CHARACTER SET utf8mb4'); $p->exec('USE ${dbName}'); $p->exec(file_get_contents('hosting/infinityfree/schema.sql'));`);
  server=spawn('php',['-S',`127.0.0.1:${httpPort}`,'-t',path.join(testDir,'htdocs'),path.join(testDir,'router.php')],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  let serverLog=''; server.stderr.on('data',b=>{serverLog+=b.toString();}); server.stdout.on('data',()=>{});
  for(let i=0;i<40;i++) {try {await fetch(base+'/health');break;} catch {await delay(100);}}
  await request('/health');
  await request('/api/admin/me',{expected:401});
  await request('/cms-private/config.php',{expected:403});
  await request('/api/admin/login',{method:'POST',data:{email:'bad@example.com',password:'bad'},expected:401});
  await request('/setup',{method:'POST',body:new URLSearchParams({token:cfg.setup_token,email:'admin@example.com',name:'Admin Test',password}),expected:201});
  await request('/setup',{expected:403});
  const login=await request('/api/admin/login',{method:'POST',data:{email:'admin@example.com',password}});
  const token=login.value.data.token;
  assert.match(login.response.headers.get('set-cookie'),/HttpOnly/i);
  assert.match(login.response.headers.get('set-cookie'),/SameSite=Lax/i);
  const me=await request('/api/admin/me',{token}); assert.equal(me.value.data.role,'ADMIN'); assert(!('passwordHash' in me.value.data));
  const sites=await request('/api/admin/sites',{token});
  const firstSite=sites.value.data[0]; assert(!('apiKeyHash' in firstSite));
  const site=await request('/api/admin/sites',{method:'POST',token,data:{name:'Test Site',slug:'test-site',domain:'test.example.com'},expected:201});
  const siteId=site.value.data.id,key=site.value.data.generatedApiKey;
  const secondSite=firstSite.id;
  await request('/api/admin/sites/'+siteId,{method:'PUT',token,data:{description:'Edited'}});
  const cat=(await request('/api/admin/categories?siteId='+siteId,{method:'POST',token,data:{name:'News',slug:'news'},expected:201})).value.data;
  const tag=(await request('/api/admin/tags?siteId='+siteId,{method:'POST',token,data:{name:'Tag',slug:'tag'},expected:201})).value.data;
  const otherCat=(await request('/api/admin/categories?siteId='+secondSite,{method:'POST',token,data:{name:'Other',slug:'other'},expected:201})).value.data;
  const postData={title:'First post',slug:'first-post',contentHtml:'<p style="text-align:center">Hello</p><script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)">',contentJson:'{}',status:'DRAFT',categoryId:cat.id,tagIds:[tag.id]};
  const post=(await request('/api/admin/posts?siteId='+siteId,{method:'POST',token,data:postData,expected:201})).value.data;
  assert(!/script|onerror|javascript:/i.test(post.contentHtml)); assert.match(post.contentHtml,/text-align:center/);
  assert.equal(post.category.id,cat.id); assert.equal(post.tags[0].tag.id,tag.id);
  await request('/api/admin/posts?siteId='+siteId,{method:'POST',token,data:{...postData,slug:'cross-site',categoryId:otherCat.id},expected:403});
  await request('/api/admin/posts?siteId='+siteId,{method:'POST',token,data:postData,expected:409});
  await request('/api/v1/posts/first-post',{headers:{'x-api-key':key},expected:404});
  await request('/api/v1/posts/first-post?preview=kd_preview_'+siteId,{headers:{'x-api-key':key},expected:404});
  const editor=(await request('/api/admin/users',{method:'POST',token,data:{name:'Editor',email:'editor@example.com',role:'EDITOR',password,siteIds:[siteId]},expected:201})).value.data;
  const editorToken=(await request('/api/admin/login',{method:'POST',data:{email:editor.email,password}})).value.data.token;
  for (const role of ['MANAGER','PUBLISHER']) {
    const email=role.toLowerCase()+'@example.com';
    await request('/api/admin/users',{method:'POST',token,data:{name:role,email,role,password,siteIds:[siteId]},expected:201});
    const roleToken=(await request('/api/admin/login',{method:'POST',data:{email,password}})).value.data.token;
    await request('/api/admin/settings?siteId='+siteId,{token:roleToken,expected:role==='MANAGER'?200:403});
    await request('/api/admin/sites/'+siteId,{token:roleToken,method:'PUT',data:{name:'No'},expected:403});
    await request('/api/admin/media?siteId='+secondSite,{token:roleToken,expected:403});
  }
  const editorSites=(await request('/api/admin/sites',{token:editorToken})).value.data; assert.equal(editorSites.length,1);
  await request('/api/admin/posts?siteId='+secondSite,{token:editorToken,expected:403});
  await request('/api/admin/users',{token:editorToken,expected:403});
  await request('/api/admin/backups/export',{token:editorToken,expected:403});
  await request('/api/admin/settings?siteId='+siteId,{token:editorToken,expected:403});
  await request('/api/admin/posts/'+post.id,{method:'PUT',token:editorToken,data:{...postData,status:'PUBLISHED'},expected:403});
  await delay(10);
  const edited=(await request('/api/admin/posts/'+post.id,{method:'PUT',token:editorToken,data:{...postData,title:'Edited draft'}})).value.data;
  const submitted=(await request('/api/admin/posts/'+post.id+'/review',{method:'POST',token:editorToken,data:{action:'submit',updatedAt:edited.updatedAt}})).value.data;
  await request('/api/admin/posts/'+post.id,{method:'DELETE',token:editorToken,expected:409});
  await request('/api/admin/posts/'+post.id+'/review',{method:'POST',token:editorToken,data:{action:'approve',updatedAt:submitted.updatedAt},expected:403});
  await request('/api/admin/posts/'+post.id+'/review',{method:'POST',token,data:{action:'approve',updatedAt:edited.updatedAt},expected:409});
  const approved=(await request('/api/admin/posts/'+post.id+'/review',{method:'POST',token,data:{action:'approve',updatedAt:submitted.updatedAt}})).value.data;
  assert.equal(approved.status,'PUBLISHED');
  const review=(await request('/api/admin/posts/'+post.id+'/review',{token})).value.data; assert.equal(review[0].action,'APPROVE_REVIEW');
  const publicPosts=await request('/api/v1/posts?category=news&tag=tag&search=Edited&fields=id,title,tags',{headers:{'x-api-key':key}});
  assert.equal(publicPosts.value.data.length,1); assert.deepEqual(Object.keys(publicPosts.value.data[0]).sort(),['id','tags','title']);
  await request('/api/v1/posts',{headers:{'x-api-key':'bad'},expected:401});
  await request('/api/v1/posts',{headers:{'x-api-key':key,'If-None-Match':(await request('/api/v1/posts',{headers:{'x-api-key':key}})).response.headers.get('etag')},expected:304});
  await request('/api/v1/categories',{headers:{'x-api-key':key}});
  await request('/api/v1/tags',{headers:{'x-api-key':key}});
  const page=(await request('/api/admin/pages?siteId='+siteId,{method:'POST',token,data:{title:'About',slug:'about',status:'DRAFT'},expected:201})).value.data;
  await request('/api/admin/pages/'+page.id,{method:'PUT',token,data:{title:'About us',slug:'about',status:'PUBLISHED'}});
  const versions=(await request('/api/admin/versions/PAGE/'+page.id,{token})).value.data;
  assert.equal(versions.length,1);
  const restored=(await request('/api/admin/versions/'+versions[0].id+'/restore',{method:'POST',token})).value.data;
  assert.equal(restored.title,'About');
  await request('/api/admin/versions/PAGE/'+page.id,{token:editorToken});
  await request('/api/v1/pages/about',{headers:{'x-api-key':key}});
  await request('/api/v1/pages',{headers:{'x-api-key':key}});
  await request('/api/admin/settings?siteId='+siteId,{method:'PUT',token,data:{siteTitle:'Test title',socialLinks:'{"website":"https://example.com"}',customMetadata:'{}'}});
  const setting=await request('/api/v1/settings',{headers:{'x-api-key':key}}); assert.equal(setting.value.data.siteTitle,'Test title');
  const menu=(await request('/api/admin/menus?siteId='+siteId,{method:'POST',token,data:{name:'Main',itemsJson:'[{"label":"Home","url":"/"}]'},expected:201})).value.data;
  await request('/api/admin/menus/'+menu.id,{method:'PUT',token,data:{name:'Main updated',location:'FOOTER',itemsJson:'[]'}});
  await request('/api/v1/menus?location=footer',{headers:{'x-api-key':key}});
  await request('/api/admin/menus?siteId='+siteId,{method:'POST',token,data:{name:'Unsafe',itemsJson:'[{"label":"Bad","url":"javascript:alert(1)"}]'},expected:400});
  const form=new FormData(); form.append('file',new Blob(['%PDF-1.4\n%%EOF'],{type:'application/pdf'}),'document.pdf');
  const media=(await request('/api/admin/media/upload?siteId='+siteId,{method:'POST',token:editorToken,body:form,expected:201})).value.data;
  await request('/api/admin/media/'+media.id,{method:'PUT',token:editorToken,data:{altText:'Document',caption:'Test'}});
  await request('/api/v1/media/'+media.id,{headers:{'x-api-key':key}});
  const otherKey=(await request('/api/admin/sites/'+secondSite+'/regenerate-api-key',{method:'POST',token})).value.data.generatedApiKey;
  await request('/api/v1/media/'+media.id,{headers:{'x-api-key':otherKey},expected:404});
  await request('/api/admin/media/'+media.id,{token:editorToken,method:'DELETE'});
  const badForm=new FormData(); badForm.append('file',new Blob(['<?php echo 1;'],{type:'image/png'}),'image.png');
  await request('/api/admin/media/upload?siteId='+siteId,{method:'POST',token,body:badForm,expected:400});
  const scheduled=(await request('/api/admin/posts?siteId='+siteId,{method:'POST',token,data:{...postData,slug:'scheduled',status:'SCHEDULED',scheduledAt:'2026-01-01T00:00:00.000Z'},expected:201})).value.data;
  await request('/api/admin/cron/publish',{method:'POST',token});
  await request('/api/v1/posts/scheduled',{headers:{'x-api-key':key}});
  await request('/api/admin/calendar?month=2026-11',{token});
  await request('/api/admin/calendar?month=2026-13',{token,expected:400});
  await request('/api/admin/calendar?month=2026-11&siteId='+secondSite,{token:editorToken,expected:403});
  await request('/api/admin/audit-logs?siteId='+siteId,{token});
  await request('/api/admin/posts',{token,expected:400});
  await request('/api/admin/posts/'+post.id,{method:'PUT',token,data:postData,headers:{Origin:'https://evil.example'},expected:403});
  // External media references are metadata, not missing local backup files.
  php(connect+`$p->exec('USE ${dbName}'); $p->exec("INSERT INTO Media (id,siteId,filename,originalName,mimeType,sizeBytes,url,createdAt,updatedAt) VALUES ('external',NULL,'remote.jpg','remote.jpg','image/jpeg',0,'https://example.com/photo.jpg','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')");`);
  const backup=await request('/api/admin/backups/export',{token});
  assert.equal(backup.value.subarray(0,2).toString(),'PK');
  fs.writeFileSync(path.join(testDir,'backup.zip'),backup.value);
  php(`$z=new ZipArchive; $z->open('${path.join(testDir,'backup.zip').replaceAll('\\','/')}'); $s=$z->getFromName('data.sql'); if(str_contains($s,'INSERT INTO `+'`Session`'+`')) throw new Exception('sessions exported'); if(!str_contains($s,'INSERT INTO `+'`Post`'+`')) throw new Exception('posts missing');`);
  await request('/rss.xml?site=test-site'); await request('/sitemap.xml?site=test-site');
  await request('/openapi.json'); await request('/admin-openapi.json'); await request('/docs'); await request('/dashboard');
  await request('/api/admin/posts/'+scheduled.id,{method:'DELETE',token});
  await request('/api/admin/pages/'+page.id,{method:'DELETE',token});
  await request('/api/admin/categories/'+cat.id,{method:'DELETE',token});
  await request('/api/admin/tags/'+tag.id,{method:'DELETE',token});
  await request('/api/admin/logout',{method:'POST',token});
  await request('/api/admin/me',{token,expected:401});
  for (let i=0;i<5;i++) await request('/api/admin/login',{method:'POST',data:{email:'admin@example.com',password:'wrong-password'},expected:401});
  await request('/api/admin/login',{method:'POST',data:{email:'admin@example.com',password},expected:429});
  // Verify actual data export can import into MySQL without depending on SQLite at runtime.
  const imported=dbName+'_imported';
  const summary=JSON.parse(fs.readFileSync('.backups/infinityfree-migration/counts.json','utf8'));
  const importedCounts=JSON.parse(php(connect+`$p->exec('CREATE DATABASE ${imported} CHARACTER SET utf8mb4'); try { $p->exec('USE ${imported}'); $p->exec(file_get_contents('hosting/infinityfree/schema.sql')); $p->exec(file_get_contents('.backups/infinityfree-migration/import-current-data.sql')); $result=[]; foreach (json_decode('${JSON.stringify(Object.keys(summary))}') as $table) $result[$table]=(int)$p->query('SELECT COUNT(*) FROM '.chr(96).$table.chr(96))->fetchColumn(); if((int)$p->query('SELECT COUNT(*) FROM Session')->fetchColumn()!==0) throw new Exception('sessions imported'); echo json_encode($result); } finally { $p->exec('DROP DATABASE ${imported}'); }`));
  assert.deepEqual(importedCounts,summary); checks++;
  assert(!serverLog.includes('Fatal error'),serverLog);
  console.log(`PASS ${checks} HTTP checks against isolated PHP 8.3 / MySQL 8.4`);
  if (process.env.CSM_TEST_BROWSER==='1') {
    // Reset test-only throttle and create a session for browser verification.
    php(connect+`$p->exec('USE ${dbName}'); $p->exec('DELETE FROM CmsRate');`);
    console.log('Browser fixture ready at '+base+'; create '+path.join(testDir,'finish')+' to finish.');
    while (!fs.existsSync(path.join(testDir,'finish'))) await delay(500);
  }
} finally {
  if (server) server.kill();
  if (mysql&&mysql.exitCode===null) {
    try {php(connect+`$p->exec('DROP DATABASE IF EXISTS ${dbName}');`);} catch {}
    spawnSync(path.join(mysqlBase,'bin/mysqladmin.exe'),['--no-defaults','--host=127.0.0.1',`--port=${port}`,'--user=root','shutdown'],{encoding:'utf8',windowsHide:true});
    mysql.kill();
  }
}
