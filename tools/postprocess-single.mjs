// 单文件离线版后处理：
// 1) <script type="module"> → <script>（file:// 下模块脚本会被 origin=null 的 CORS 拦截）
// 2) 产物名改为 cat-match-offline.html（发微信/存手机一看就知道是离线包）
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';

const dir = 'dist-offline';
const p = dir + '/index.html';
let h = readFileSync(p, 'utf8');
const before = (h.match(/<script[^>]{0,40}>/g) || []).slice(0, 2).join(' | ');
h = h.replace(/<script type="module" crossorigin>/g, '<script>')
     .replace(/<script type="module">/g, '<script>');
writeFileSync(p, h);
console.log('script 标签: [' + before + '] → [' + (h.match(/<script[^>]{0,40}>/g) || []).slice(0, 2).join(' | ') + ']');

const out = dir + '/cat-match-offline.html';
if (existsSync(out)) writeFileSync(out, h); else renameSync(p, out);
console.log('产物:', out, (readFileSync(out).length / 1048576).toFixed(2), 'MB');
