import books from './books.js';
const links=[];
for (let i in books) {
	const url='http://www.open-lit.com/html/GetFile.php?getType=lit&getId='+i;
	//console.log('curl '+url+' > '+ i+'.zip');
	console.log(url)
}

