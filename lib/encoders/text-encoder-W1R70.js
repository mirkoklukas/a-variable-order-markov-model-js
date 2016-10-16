


var _          = require("underscore")
var alphabet   = require("./alphabets/alphaR70.json")
let reduce     = alphabet.reduceObj;
let reducedAlphabet = alphabet.reduced;
let position   = alphabet.position;
let DEFAULT    = alphabet.DEFAULT;
let range      = alphabet.reduced.length;
let bitIds     = _.range(0,range);
let codeWeight =  1;

var encode = function (x) { 
	var encodedInput = [];
	if(x in reduce) {
		return [position[reduce[x]]];
	} else { 
		return [position[DEFAULT]];
	}
};

var decode = function (X) { 
	return reducedAlphabet[X[0]]
};

module.exports = {encode, decode, bitIds, range, codeWeight};
