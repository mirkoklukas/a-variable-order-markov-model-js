
var fs = require('fs');
var _ = require("underscore")

var encoderFac = function (k = 1, alphabetJSON = "./alphabets/alphaR70.json") {

	var alphabet = require(alphabetJSON)
	let reduce = alphabet.reduceObj;
	let reducedAlphabet = alphabet.reduced;
	let position = alphabet.position;
	let DEFAULT = alphabet.DEFAULT;
	let range = k*alphabet.reduced.length;
	let bitIds = _.range(0,range);
	let codeWeight=  k;
	let n = range;
	

	var encode = function (x) { 
		var encodedInput = [];
		if(x in reduce) {
			return bitIds.slice(position[reduce[x]]*k, position[reduce[x]]*k + k)
		} else { 
			return bitIds.slice(position[DEFAULT]*k, position[DEFAULT]*k + k)
		}
	};

	var decode = function (list) { 
		var decoded = {};
		list.forEach(function (i) {
				var x = reducedAlphabet[Math.floor(i/k)];
				if(decoded[x] == undefined) 
					decoded[x] = 1;
				else 
					decoded[x] += 1;	
		});
		return decoded;
	};

	return {encode, decode, bitIds, range, codeWeight};
};

module.exports = encoderFac;


