const fs = require('node:fs/promises');
const path = require('node:path');
const base = 'https://ueeshop.ly200-cdn.com/u_file/UPBB/UPBB237/';
const files = [
 ['frame-1.png','2405/23/products/1fdb4dccb6.png'],['frame-2.png','2405/23/products/30a552d68e.png'],
 ['frame-3.png','2509/12/products/2-1615081d73.png'],['frame-4.png','2509/12/products/1-161504b81c.png'],
 ['frame-5.png','2405/23/products/15ff62beb4.png'],['frame-6.png','2405/23/products/260d1c8ebf.png'],
 ['frame-7.png','2405/23/products/71aa7c1628.png'],['frame-8.png','2405/23/products/0203fc8d03.png'],
 ['geometry.jpg','2503/06/photo/370a6710c580287b0abc5652a61b314.jpg'],
 ['detail-1.jpg','2604/01/photo/111.jpg'],['detail-2.jpg','2604/01/photo/0ef893fec8be885f508f65020389f398.jpg'],
 ['detail-3.jpg','2604/01/photo/4b5f551984e4aa2046ae2c5827e71466.jpg'],
 ['detail-4.jpg','2604/01/photo/parkhotelvalkenburgct-20251020162749-56866930118373310986150290990543335732492772n1.jpg'],
 ['detail-5.jpg','2604/01/photo/parkhotelvalkenburgct-20251020162749-567962547183733109741502902807106963456289929n.jpg']
];
(async()=>{
 const dir=path.resolve(__dirname,'../assets/products/tavelo-arow');
 await fs.mkdir(dir,{recursive:true});
 await Promise.all(files.map(async([name,url])=>{const response=await fetch(base+url+'?x-oss-process=image/quality,q_85/resize,m_lfit,h_0,w_'+(name==='geometry.jpg'?3000:1400));if(!response.ok)throw Error(name+': '+response.status);await fs.writeFile(path.join(dir,name.replace('.', '-display.')),Buffer.from(await response.arrayBuffer()));console.log(name);}));
})();
