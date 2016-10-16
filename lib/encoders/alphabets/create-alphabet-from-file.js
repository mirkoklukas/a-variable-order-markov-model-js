var fs = require('fs');
var chalk = require('chalk');

if (process.argv.length < 4) {
    console.log("Usage: ", "node", "create-alphabet-from-file.js", "source-txt", "target-json")
    process.exit(-1);
}

var filename = process.argv[2];
var targetfilename = process.argv[3];

var file = fs.readFileSync(filename, "utf8");
var acceptable = Array.from(new Set(file.split("").concat(file.toLowerCase().split("")))).sort();
var reducedAlphabet = Array.from(new Set(file.toLowerCase().split(""))).sort();
var DEFAULT = "<DEFAULT>";
reducedAlphabet.push(DEFAULT)


var reduce = {};
acceptable.forEach(function (a) {
	reduce[a] = a.toLowerCase();
});

var position = {}
reducedAlphabet.forEach(function (a,i) {
	position[a] = i;
});

var alpha = {
	"acceptable": acceptable,
	"reduced"	: reducedAlphabet,
	"reduceObj"	: reduce,
	"position"	: position,
	"DEFAULT"	: DEFAULT
};

fs.writeFileSync(targetfilename, JSON.stringify(alpha, null, 2))
