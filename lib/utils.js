var logger = require('winston');
// var logger = require('./logger.js')
var chalk = require('chalk');

logger.level = 'debug';
let _ = require('lodash');

let shuffle = require('shuffle-array');

var pickRandomNFrom = function (n, arr) {
    if(arr.length === 0) 
        return [];
    if (n===1) 
        return [shuffle.pick(arr)];
    else 
        return shuffle.pick(arr, {'picks': n});
};


var segmentPredictorAlphaScore = function (stateSpace, segment) {
	let weight   = stateSpace.segmentWeights[segment];
	let activity = stateSpace.segmentActivities[segment];

	return 1 - (weight + 1)/(activity +  2)
};

let Phi = function (alpha, epsilon) {

	if(alpha < 0.5 - epsilon) {
		return 0;
	} else if (alpha > 0.5 + epsilon) {
		return 1;
	} else {
		return (0.5/epsilon)*(alpha - 0.5) + 0.5;
	}
};

var segmentPredictor = function (stateSpace, segment) {
	logger.debug(chalk.gray(stateSpace.segmentWeights[segment]),chalk.gray(stateSpace.segmentActivities[segment]))
	let alphaScore = segmentPredictorAlphaScore(stateSpace, segment);
	let activity   = stateSpace.segmentActivities[segment];
	let epsilon    = 1/(2*Math.sqrt(activity + 2));

	if(Math.random() < Phi(alphaScore, epsilon)) return 0;
	else return 1;
};

var majorityVoteBinary = function (votes) {
	let counts = { '0': 0, '1': 0 };
	votes.forEach(x => {counts[x] += 1;});

	if(counts[1] == counts[0]) 
		return Math.random() < 0.5 ? 0 : 1 ;
	else 
		return counts[1] > counts[0] ? 1 : 0 ;
};

module.exports = {
	pickRandomNFrom,
	segmentPredictor,
	majorityVoteBinary
};