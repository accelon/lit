import {TITLESEP,kluer,glob,nodefs,writeChanged,readTextContent, readTextLines,patchBuf} from 'pitaka/cli';
import {extractChineseNumber} from 'pitaka/utils';
import BookNames from './booknames.js'
import EUDC from './eudc.js';
import Errata from './errata.js';
import JSZip from  'jszip'
await nodefs;
const outdir='off/';
const id=process.argv[2];
const zipfn='zip/lit_'+id+'.zip'
const eudc={};

const tidy=str=>str.replace(/<<([\d▉\u3400-\u9fff]+)>>/g,'《$1》')
           .replace(/<([\d▉\u3400-\u9fff]+)>/g,'〈$1〉');


const ctx={nchapter:0};

const getZipFileToc=async (zip,zipfn)=>{
    const zipfiles=[],tocpage=[];
    const indexhtml=await zip.files['index.html'].async('string');

    const m=indexhtml.match(/<title>([^ <]+)/); 
    if (m) {
        const id=zipfn.match(/lit_(\d+)/)[1];
        tocpage.push('^bk'+id+' '+m[1]); //第一行為書名，和haodoo 一致
    } else {
        tocpage.push('^bk 缺書名');
    }

    indexhtml.replace(/<a href="([\d]+\.html)" target="right_Article" ?>(.+?)<\/a>/g,(m,fn,toc)=>{
        if (!zip.files[fn]) console.log(fn,'not found');
        tocpage.push(toc.replace(/<[^>]+>/g,''))
        zipfiles.push(fn);
    })

    if (zipfiles.indexOf('readme.html')==-1 && zip.files['readme.html']) {
        zipfiles.push('readme.html');
        tocpage.push('本書說明')
    }
    return {files:zipfiles, tocpage};
}


const parseHeader=(str,fn)=>{
    str=str.replace(/<[^>]+>/g,'');
    const cn=extractChineseNumber(str);
    if (cn) {
        if (cn && cn!==ctx.nchapter+1 && cn!==1) {
            console.log('chapter number',fn,str,cn,'prev',ctx.nchapter+1);
        }
        str=str.replace(/[第卷]?([一二二三四五六七八九十百○]+)[回章]　+/,'$1'+TITLESEP);
        ctx.nchapter=cn;
        return '^ck'+cn+'['+str+']';
    } else {
        return '^ck'+(ctx.nchapter+1)+'['+str+']';
    }
}

const dofile=(content,fn)=>{
    const out=[];

    const rawlines=tidy(patchBuf( content, Errata[fn])).split(/\r?\n/);

    for (let i=0;i<23;i++) rawlines.shift();
    rawlines.length=rawlines.length-29;
    const ch=parseHeader(rawlines.shift().trim(),fn);
    out.push(ch);
    
    for (let i=0;i<rawlines.length;i++) {
        let s=rawlines[i].replace(/<br \/>$/i,'').replace(/<br \/>$/i,'')
        .replace(/<br>$/ig,'\n')
        .replace(/^\t+/,'');
        if (!s) continue;
        const space=s[0].match(/[a-zA-Z_\d]/)?' ':'';
        s=s.replace(/<img src=[\-a-z\.\/:]+([A-Z\d]+)\.BMP[^>]+>/g,(m,m1)=>{
            const u=EUDC[m1];
            if (!u) {
                if (!eudc[m1]) {
                    console.log('missing eudc',m1,fn);
                    eudc[m1]=0;
                }
                eudc[m1]++;
            }
            return u?u:"^mc[$1]";
        })

        s=s.replace(/<b>([^<]+)<\/b>/ig,'^b[$1]');
        s=s.replace(/<i>([^<]+)<\/i>/ig,'^i[$1]');
        s=s.replace(/^　　 ?\^b\[([^\[]+)\]$/,'^h'+space+'$1');
        s=s.replace(/<br>/ig,'\n');
        s=s.replace(/<br \/>/ig,'\n');

        s=s.replace(/<\/?td[^>]*>/g,'')
        s=s.replace(/<\/?tr[^>]*>/g,'')
        s=s.replace(/<\/?table[^>]*>/g,'')
        if (s.indexOf('<')>0) {
            this.log('residue tag',this.context.filename,':',(i+24),
            s.substr(s.indexOf('<'),50));
            this.context.error++;
        }
        out.push(s);
    }
    return out;
}


fs.readFile(zipfn, function(err, data) {
    if (err) throw err;
    JSZip.loadAsync(data).then(async function (zip) {
    	const out=[];
    	const {files,tocpage}=await getZipFileToc(zip,zipfn);
	    for (let i=0;i<files.length;i++){

	    	const fn=files[i];
	    	const content=await zip.file(fn).async('string');
	    	const tidied=dofile(content,fn);
	    	out.push(...tidied);
	    	if (i==0) {
	    		out[0]='^bk'+id+'['+BookNames[id]+']' +out[0];
	    	}
	    }
	    if ( writeChanged(outdir+id+'.off',out.join('\n'))){
	    	console.log('written',id+'.off',out.length)
	    }
    });

});
