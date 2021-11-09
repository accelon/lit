import {nodefs} from 'pitaka/platform';
import { makeHook } from 'pitaka/offtext';
import {phraseQuery,plCount,plFind,scoreRange,weightToken,convolute,getNthTokenX
,TK_NAME,TK_OFFSET,TK_POSTING,TK_WEIGHT} from 'pitaka/fulltext'
import {openBasket} from 'pitaka'
import {resetCounter,getCounter,getSpeed} from 'pitaka/fulltext'
import {diffCJK} from 'pitaka/utils' 
import {kluer} from 'pitaka/cli'
const {yellow,red} = kluer;
await nodefs;
let t=performance.now(); 
const ptk= await openBasket('lit'); 
// console.log('open',(performance.now()-t).toFixed(4),'ms');   
t=performance.now(); 
// const q="一交栽在溝跟前，弄了一身泥水。" //from gycd , source is 「一跤栽倒了，弄了一身泥！」
// const q='鳳姐上座，尤二姐命丫鬟拿褥子來便行禮'      
// const q='來昇家的每日攬查看，或有偷懶的、賭錢吃酒的、打架拌嘴的，立刻來回我'      
// const q='我打發人取了來，一併叫人連絹交給相公們礬去如何。'      
// const q='一動不如一靜，我們這裡就算好人家' 
// const q='若冷吃下去，便凝結在內，以五臟去暖他，豈不受害'
// const q='寶玉說：「不必燙暖它了，我只愛喝冷的！」'
const q='旌旗蔽日，鎧甲凝霜，人強馬壯，威風凜然'
// const q='懿取了張當供詞，卻捉何晏等勘問明白，皆稱三月間欲反。'
// const q='怨不得你顧一不顧二的作這些事出來，原來你竟糊塗'
t=performance.now(); 
// const qr=await phraseQuery(ptk,q);  
// const qr2=await phraseQuery(ptk,"比丘尼"); 
const tokens=(await ptk.prepareToken(q));
// console.log(tokens.map(tk=>tk[1].length+tk[2]))
const qlen=tokens.length*1.3;
const weighted=weightToken(tokens)   
// console.log(weighted)
// console.log('result',(performance.now()-t).toFixed(4),'ms',weighted.map(it=>[it[TK_WEIGHT],it[TK_NAME],it[TK_POSTING].length]));  
// console.log('total hit',weighted.reduce((p,v)=>v[TK_POSTING].length+p,0),'lines',ptk.inverted.linetokenpos.length)

resetCounter();
// console.time('scoring')
// console.log(ptk.inverted.linetokenpos.slice(0,5)) 
const scores=scoreRange(weighted,ptk.inverted.linetokenpos,{minscore:0.8}).slice(0,3);
// console.timeEnd('scoring');
// console.log(scores)
// console.log('counter',getCounter(),'maxspeed',getSpeed())

await ptk.prefetchLines( scores.map(it=>it[0]) );
for (let i=0;i<scores.length;i++) { 
    // convolute before diff 
    const y=scores[i][0];
    const src=ptk.getLine(y);   
    const from=ptk.inverted.linetokenpos[y-1],to=ptk.inverted.linetokenpos[y];
    const at=convolute(weighted,qlen,from,to);

    const x=getNthTokenX(src, at-from); 
    const [d, adjx, adjw,sim]=diffCJK(q,src,x, q.length*1.5);//.filter(it=>q.length*2>it.value.length);
    console.log(y,src )    
    if (adjw==0) continue;
    const hook=makeHook(src,adjx,adjw);
    console.log(y,x,sim,'hook',hook,'score',scores[i][1],src.substr(x ,q.length*1.5) ,from,at, at-from) 

    let out='';
    d.forEach( ({added,value,removed})=>{
        if (!added && !removed) {
            out+=value
        } else if (added) {
            out+=yellow(value);
        }
    })
    console.log(out);
    let out2='';
    d.forEach( ({added,value,removed})=>{
        if (!added && !removed) {
            out2+=value
        } else if (removed) {
            out2+=red(value);
        }
    })
    console.log(out2,y)

}
