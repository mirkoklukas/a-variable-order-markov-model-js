"use strict";

var chalk = require('chalk');
var argvee = require('./argvee.js');

var argv = argvee.expect([
	{name: 'source-dir', optional: false, flag: false, type: 'Str'},
	{name: 'target-dir', optional: false, flag: false, type: 'Str'},
	{name: 'coder-json', optional: false, flag: false, type: 'Str'},
	{name: '--lzn-level', optional: false, flag: true, type: 'Num'},
	{name: '--save-as', optional: true, flag: true, type: 'Str'}
]).example([
        "../data/lzn-sources/test",
        "../data/lzn-sources/test",
        "../data/coder-sources/test/W1R70Coder.json",
        '--lzn-level=0',
        "--save-as=../data/coder-sources/test/W1R70Coder-1.json"
]).apply();


let sourcedir     = argv['source-dir'] ,
	targetdir     = argv['target-dir'] ,
	coderSource   = argv['coder-json'] ,
	levelProvided = 'lzn-level' in argv,
	level         = levelProvided ? argv['lzn-level'] : -1,
	shouldSave    = 'save-as' in argv,
	coderTarget   = shouldSave ? argv['save-as'] : "";

if(sourcedir.slice(-1) != '/')  sourcedir+= '/';
if(targetdir.slice(-1) != '/')  targetdir+= '/';

let Coder     = require('./../lib/lzn-sequence-coder');
let coderObj  = require(coderSource);
let coder     = Coder.fromSerialized(coderObj);
let fs        = require('fs');
let readline  = require('readline');
let serialize = require('./../lib/stupid-serializer')
let Promise   = require('promise');




var isLZN = function (filename) {
	var ending = filename.split(".").slice(-1)[0];
	var level  = filename.split(".").slice(-2)[0];
	var experiment = filename.split(".").slice(-3)[0];
	return (ending == 'lzn' || ending == 'LZN') && !isNaN(level);
};

var lznLevel = function (filename) {
	var level = filename.split(".").slice(-2)[0];
	return parseInt(level);
};

var lznExperiment = function (filename) {
	var experiment = filename.split(".").slice(-3)[0];
	return parseInt(experiment);
};

var strip = function (filename) {
	var splitted = filename.split(".")
	return filename = splitted.slice(0,splitted.length - 2).join(".");
};


let trainOnDataFromFile = function (sourcedir, targetdir, file) {
	return new Promise(function (fulfill, reject){
	
		if(!isLZN(file)) reject(new Error("Not a lzn file extension"));
		console.log(`${chalk.blue('Consuming')} inputs from ${JSON.stringify(file)}`);

		var lineReader = readline.createInterface({input: fs.createReadStream(sourcedir + file)});
		var targetFile = `${strip(targetdir + file)}.${lznLevel(file)+1}.lzn`;
		var visitedFirstAlready = false;
		var start = Date.now();

		lineReader.on('line', line => {
			if(!visitedFirstAlready) {
				
				visitedFirstAlready = true;
				let header    = JSON.parse(line);
				let newHeader = {
					"source":     sourcedir + file,
					"encoder":    coderSource,
					"level":      header.level + 1,
					"codeWeight": coder.outputCodeWeight,
					"range":      coder.outputRange
				};
				fs.writeFileSync(targetFile , JSON.stringify(newHeader));
			} else {
				let outputPattern = coder.consume(JSON.parse(line));
				fs.appendFileSync(targetFile, outputPattern);
			}
		});

		lineReader.on('close', ()  => {
			var end= Date.now();
			console.log(chalk.dim(`...${(end - start)/60/60} minutes`));
			coder.filesBeenTrainedOn.push(sourcedir + file);
			fulfill();
		});

		lineReader.on('error', function(e) {
			reject(e);
	  	});
  	});
};




fs.readdir(sourcedir, function(err, items) {
	items = items.filter(item => fs.statSync(sourcedir + item).isFile());
	items = items.filter(isLZN);
	if(levelProvided) {
		items = items.filter(file => lznLevel(file) == level);
	}
	console.log(`\n${chalk.bold('Feeding LZN-files')} from ${sourcedir} to sequence coder ${coderSource}:\n${chalk.dim('...' + JSON.stringify(items))}\n`)

	let learnFiles = items.reduce(function (promise,file) {
		return promise.then(result => trainOnDataFromFile(sourcedir, targetdir, file));
	}, new Promise((fulfill, reject) => {
		fulfill();
	}));

	learnFiles.done(result => {
		if(shouldSave) { 
			console.log()
			console.time("Saving coder");
			coder.reset();
			serialize(coder, coderTarget);
			console.timeEnd("Saving coder")
			console.log(coderTarget)
			console.log()
		}

	});


});





