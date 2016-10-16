var fs = require('fs');

var feedToReadStream = function (obj, rs) {
	"use strict";

	if(obj instanceof Array) {
		rs.write('[')

		for (let i=0; i<obj.length-1; i++) {
			feedToReadStream(obj[i], rs) 
			rs.write(',') 
		}
		if(obj.length > 0) { 
			feedToReadStream(obj[obj.length-1], rs)
		}
		rs.write(']')
	}
	else if(obj instanceof Object) {
		rs.write('{')
		let objkeys = Object.keys(obj);
		for (let i=0; i<objkeys.length-1; i++) {
			let key = objkeys[i];
			rs.write(JSON.stringify(key) + ':')
			feedToReadStream(obj[key], rs)
			rs.write(',')
		}
		if (objkeys.length > 0) { 
			let key  = objkeys[objkeys.length - 1];
			rs.write(JSON.stringify(key) + ':')
			feedToReadStream(obj[key], rs)
		} 
		rs.write('}')

	}
	else { 
		rs.write(JSON.stringify(obj))	
	}
};


var serializeObjToFile = function (obj, file) {
	// console.log(chalk.green(`Done parsing file. Saving coder now...patience...`))
	fs.writeFileSync(file, "");
	var wstream = fs.createWriteStream(file);

	// var fileDescriptor = fs.openSync(file, 'w')
	feedToReadStream(obj, { write: function (str) {
		// wstream.write(str);	
		// fs.writeSync(fileDescriptor, str)
		fs.appendFileSync(file, str);
	}}); 
	// wstream.end()	
};





module.exports = serializeObjToFile;


