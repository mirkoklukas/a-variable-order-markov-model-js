"use strict";
var chalk = require('chalk');


var argvee = require('./argvee.js');

var argv = argvee.expect([
    	{name: "source-dir",   type: 'Str'},
    	{name: "target-dir",   type: 'Str'},
    	{name: "encoder",      type: 'Str'},
    	{name: "--annotate", optional: true, flag: true,  type: 'Str'}
]).example([
    	"../data/text-sources/", 
    	"../data/lzn-sources/", 
    	"../lib/encoders/text-encoder-W1R70.js",
    	"--annotate=-w1r70"
]).apply();


let sourcedir  = argv['source-dir'];
let targetdir  = argv['target-dir'];
let	encoderpath = argv['encoder'];
let hasAnnotation = 'annotate' in argv;
let	annotation = hasAnnotation ? argv['annotate'] : undefined;


if(sourcedir.slice(-1) != '/')  sourcedir+= '/';
if(targetdir.slice(-1) != '/')  targetdir+= '/';


let {encode, decode, range, codeWeight} = require(encoderpath);
let k = codeWeight;
let n = range;
let fs = require('fs');
let readline  = require('readline');


let encodeFile = function (sourcedir, targetdir, file) {
	var lineReader = readline.createInterface({input: fs.createReadStream(sourcedir + file)});
	let headerData = {
		"source": sourcedir + file,
		"encoder": encoderpath,
		"level": 0,
		"codeWeight": k,
		"range": n
	};

	let i = file.lastIndexOf('.');
	let croppedFile = file.slice(0,i)
	let targetFile = `${targetdir + croppedFile}${hasAnnotation? annotation : ""}.0.lzn`

	fs.writeFileSync(targetFile, JSON.stringify(headerData))


	lineReader.on('line', line => {
		let encodedLine = line.split("")
							  .concat(["\n"])
							  .map(x => '\n' + JSON.stringify(encode(x)) )
							  .join("");

		fs.appendFileSync(targetFile, encodedLine);
	});

	lineReader.on('close', ()  => {
		console.log(`Done encoding: ${file}`)
		console.log(`Encoded as: ${targetFile}`)
	});
};



fs.readdir(sourcedir, function(err, items) {
	items = items.filter(item => fs.statSync(sourcedir + item).isFile());
	console.log(`Encoding files from ${sourcedir} ${JSON.stringify(items)}`)
	items.forEach(file => {encodeFile(sourcedir, targetdir, file);});
});
