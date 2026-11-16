const potrace=require('potrace'),fs=require('fs');
const jobs=[['clean_w.png','#FFFFFF'],['clean_t.png','#1FD1C1'],['icon_w.png','#FFFFFF'],['icon_t.png','#1FD1C1']];
let n=0;const out={};
for(const [f,c] of jobs){potrace.trace(f,{turdSize:30,optTolerance:0.4,threshold:128,color:c,background:'transparent'},(e,svg)=>{if(e)throw e;const d=[...svg.matchAll(/ d="([^"]+)"/g)].map(m=>m[1]).join(' ');out[f]=d;if(++n===jobs.length){fs.writeFileSync('paths.json',JSON.stringify(out));console.log(Object.entries(out).map(([k,v])=>k+':'+v.length).join(' '))}});}
