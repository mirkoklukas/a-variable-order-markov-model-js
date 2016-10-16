"use strict";
var fs = require('fs');
var chalk = require('chalk');
var argvee = require('./argvee.js');

var argv = argvee.expect([
        'json-target-file',
        'input-range',
        'output-range',
        'input-code-weight',
        'output-code-weight',
        'theta',
        'segment-domain-size'
]).example([
    '../data/coder-sources/test/W1R70Coder.json',
    '70',
    '70',
    1, 
    1,
    1, 
    1,
]).apply();


var coderfile         = argv['json-target-file'];
var inputRange        = argv['input-range'];
var outputRange       = argv['output-range'];
var inputCodeWeight   = argv['input-code-weight'];
var outputCodeWeight  = argv['output-code-weight'];
var theta             = argv['theta'];
var segmentDomainSize = argv['segment-domain-size'];

let config = { 
	incr: 1.,
	decr: 0.,              
	inputRange,
    outputRange,      
	inputCodeWeight,
    outputCodeWeight, 
    theta,             
    segmentDomainSize
};

var Coder = require('../lib/lzn-sequence-coder.js');
var coder = new Coder(config).initializeZeros();

console.log(`Creating sequence coder:\n${JSON.stringify(config, null, 2)}`);
fs.writeFileSync(coderfile, JSON.stringify(coder));




