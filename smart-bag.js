/* Local, review-first product date helpers. No image or OCR text leaves this device. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SmartBag=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const pad=n=>String(n).padStart(2,'0');
function validDate(y,m,d){const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?`${y}-${pad(m)}-${pad(d)}`:null}
function parseDate(value){if(!value)return null;const m=String(value).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?validDate(+m[1],+m[2],+m[3]):null}
function addMonths(date,months){const d=parseDate(date);if(!d||!Number.isInteger(+months)||+months<=0)return null;const [y,m,day]=d.split('-').map(Number),target=new Date(Date.UTC(y,m-1+Number(months),1)),last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();return validDate(target.getUTCFullYear(),target.getUTCMonth()+1,Math.min(day,last))}
function deadline(product,now=new Date()){const expiry=parseDate(product.expiry),after=addMonths(product.opened,product.pao),use=expiry&&after?(expiry<after?expiry:after):expiry||after;const today=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));const days=use?Math.ceil((new Date(use+'T00:00:00Z')-today)/86400000):null;return {expiry,after,use,days}}
function status(product,threshold=30,now=new Date()){const d=deadline(product,now);return !d.use?'Срок не определён':d.days<0?'Истёк':d.days<=threshold?'Скоро истекает':'В срок'}
function parseOcr(text,source,jar=false){const dates=[],paos=[],lines=String(text||'').split(/\n|\r|;/).map(x=>x.trim()).filter(Boolean);for(const line of lines){
 const manufacturing=/\b(mfg|manufactur|produced|batch|lot)\b|изготов|произвед|партия|дата открытия/i.test(line),label=/\b(exp|expiry|best\s*before|use\s*by)\b|годен\s*до|использовать\s*до/i.test(line);
 const re=/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})|(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})|(\d{1,2})[.\/-](20\d{2})/g;let m;
 while((m=re.exec(line))){let y,mon,day;if(m[1]){day=+m[1];mon=+m[2];y=+m[3];if(y<100)y+=y<70?2000:1900}else if(m[4]){y=+m[4];mon=+m[5];day=+m[6]}else{mon=+m[7];y=+m[8];day=new Date(Date.UTC(y,mon,0)).getUTCDate()}
 const value=validDate(y,mon,day);if(value&&!manufacturing)dates.push({value,source,raw:m[0],confidence:label?'high':'low',note:label?'Подпись срока годности':'Подпись срока не найдена — проверь вручную'})}
 const paoLabel=/\b(PAO|after\s*opening|months?\s*after\s*opening)\b|после\s*вскрытия/i.test(line);const paoRe=/(\d{1,3})\s*[МM]\b/gi;
 while((m=paoRe.exec(line))){const value=+m[1];if(value>0&&value<=120)paos.push({value,source,raw:m[0],confidence:paoLabel&&jar?'high':'low',note:jar?'Похож на знак открытой баночки; проверь вручную':paoLabel?'Есть подпись PAO; проверь вручную':'Число M без подтверждённого значка баночки'})}
 }return {dates,paos}}
/* Detects a simple lid and bowl outline around OCR's M token. This is only a hint, never automatic confirmation. */
function jarContext(image,box){if(!image||!box)return false;const {data,width,height}=image;if(!data||!width||!height)return false;const x0=Math.max(0,Math.floor(box.x0-box.w*.8)),x1=Math.min(width-1,Math.ceil(box.x1+box.w*.8)),top=Math.max(0,Math.floor(box.y0-box.h*.85)),bottom=Math.min(height-1,Math.ceil(box.y1+box.h*.8));if(x1-x0<8||bottom-top<8)return false;const dark=(x,y)=>{const i=(y*width+x)*4;return data[i]+data[i+1]+data[i+2]<360&&data[i+3]>100};let above=false,below=false,sides=0;for(let y=top;y<box.y0;y++){let run=0;for(let x=x0;x<=x1;x++){run=dark(x,y)?run+1:0;if(run>=(x1-x0)*.55)above=true}}for(let y=Math.ceil(box.y1);y<=bottom;y++){let run=0;for(let x=x0;x<=x1;x++){run=dark(x,y)?run+1:0;if(run>=(x1-x0)*.45)below=true}}for(let y=Math.floor(box.y0);y<=Math.ceil(box.y1);y++){for(let x=x0;x<x0+(x1-x0)*.25;x++)if(dark(x,y)){sides++;break}for(let x=x1;x>x1-(x1-x0)*.25;x--)if(dark(x,y)){sides++;break}}return above&&below&&sides>=2}
return {parseDate,addMonths,deadline,status,parseOcr,jarContext};
});
