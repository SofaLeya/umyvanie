const {test}=require('node:test');const assert=require('node:assert/strict');const C=require('../core.js');
function store(seed={}){const data={...seed};return {get length(){return Object.keys(data).length},key(i){return Object.keys(data)[i]||null},getItem(k){return data[k]??null},setItem(k,v){data[k]=String(v)},removeItem(k){delete data[k]},data}}
const defaults=[{id:'am-wash',name:'Умыться',prod:'SaliZink на лоб и нос, Kora на щёки и подбородок',next:'Aravia Galactomyces',g:'am'},{id:'pm-wash',name:'Умыться',prod:'Kora',g:'pm'}];
test('legacy migration creates safety copy, splits products, links steps, and stays idempotent',()=>{const cfg={steps:{'am-wash':{prod:'SaliZink на лоб и нос, Kora на щёки и подбородок'}},custom:[{id:'c1',name:'Мой шаг',prod:'Custom',g:'pm'}]};const s=store({'skin:cfg':JSON.stringify(cfg),'skin:2026-10-10':JSON.stringify({'am-wash':true})});const before=s.getItem('skin:cfg');const first=C.migrate(s,defaults);assert.equal(first.products.length,4);assert.equal(first.products.find(p=>p.name==='Kora').stepIds.length,2);assert.equal(first.products.find(p=>p.name==='Aravia Galactomyces').status,'planned');assert.equal(s.getItem('skin:cfg'),before);assert.ok(s.getItem('skin2:safety:migration'));assert.equal(C.migrate(s,defaults).changed,false);assert.equal(JSON.parse(s.getItem('skin:products')).length,4)});
test('invalid legacy settings stop migration without writes',()=>{const s=store({'skin:cfg':'{broken'});assert.throws(()=>C.migrate(s,defaults));assert.equal(s.getItem('skin:schemaVersion'),null)});
test('old backup validates and merges unique fields',()=>{
 const old={app:'umyvanie',v:1,data:{'skin:2026-10-10':JSON.stringify({'am-wash':true}),'skin:diary:2026-10-10':JSON.stringify({s:4})}};
 const incoming=C.validBackup(old);
 const merged=C.mergeData({'skin:2026-10-10':JSON.stringify({'pm-wash':true})},incoming);
 assert.deepEqual(JSON.parse(merged.data['skin:2026-10-10']),{'pm-wash':true,'am-wash':true});
 assert.throws(()=>C.validBackup({app:'umyvanie',v:1,data:{'skin:cfg':'{bad'}}));
});
test('analytics exclude missing skin records and unused care days',()=>{const s=store({'skin:diary:2026-10-10':'{"s":4,"t":["шелушится"]}','skin:2026-10-10':'{"am-wash":true,"pm-adapalene":true,"_am":1,"_pm":0}'});const a=C.analytics(s,'2026-10-11',7);assert.equal(a.points.length,1);assert.equal(a.points[0].peeling,1);assert.equal(a.applied,1);assert.equal(a.completion,50)});
