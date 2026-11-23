const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
for(const file of ['index.html','beauty.css','core.js','smart-bag.js','gallery.js','smart-ui.js','vendor/ocr/tesseract.min.js','app2.js','app.js','ydsync.js','tgbk.js','manifest.webmanifest','face.png','icon-192.png','icon-512.png']){
 if(!fs.existsSync(file))throw Error('Missing PWA asset: '+file);
 if(file.endsWith('.js')&&!html.includes('src="'+file+'"')&&file!=='sw.js')throw Error('Missing script tag: '+file);
 if(!sw.includes("'"+file+"'"))throw Error('Missing offline cache entry: '+file);
}
for(const file of ['vendor/ocr/worker.min.js','vendor/ocr/lang/eng.traineddata.gz','vendor/ocr/lang/rus.traineddata.gz','vendor/ocr/core/tesseract-core.wasm.js','vendor/ocr/core/tesseract-core-simd.wasm.js','vendor/ocr/core/tesseract-core-lstm.wasm.js','vendor/ocr/core/tesseract-core-simd-lstm.wasm.js'])if(!fs.existsSync(file))throw Error('Missing local OCR asset: '+file);
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));if(manifest.display!=='standalone')throw Error('Invalid PWA display');
console.log('Build and PWA assets OK');
