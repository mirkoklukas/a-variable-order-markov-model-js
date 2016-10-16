/** @module LZN sequence coder */

var _ = require('lodash');
var shuffle = require('shuffle-array');
var StateSpace = require('./gen-state-space');
var GeoPooler = require('./geo-pooler.js')
var chalk = require('chalk');
var logger = require('winston');
// logger.level = 'debug';
logger.level = 'info';


var pickRandomNFrom = function (n, arr) {
    if(arr.length === 0) 
        return [];
    if (n===1) 
        return [shuffle.pick(arr)];
    else 
        return shuffle.pick(arr, {'picks': n});
};

/**
 * Sequence Coder 
 * @constructor
 */
var SequenceCoder = function (obj = {}) {
    let config = Object.assign({ 
            incr: 1, 
            decr: 1
    }, obj);

    this.incr              = config.incr;
    this.decr              = config.decr;
    this.inputRange        = config.inputRange;
    this.outputRange       = config.outputRange;
    this.inputCodeWeight   = config.inputCodeWeight; 
    this.outputCodeWeight  = config.outputCodeWeight; 
    this.theta             = config.theta;
    this.segmentDomainSize = config.segmentDomainSize || config.theta;
    
    this.lastPattern     = [];
    this.lastState       = [];
    this.lastPrediction  = {};
    this.lastScore       = {};
    this.lastOutput      = [];
    
    this.stateSpace = new StateSpace({
        'alphabet': _.range(this.inputRange),
        'theta': this.theta
    });

    this.filesBeenTrainedOn = [];

};


SequenceCoder.fromSerialized = function (obj) {
    let newCoder = new SequenceCoder();
    Object.assign(newCoder, obj);
    newCoder.stateSpace = StateSpace.fromSerialized(obj.stateSpace);
    return newCoder;
};

SequenceCoder.prototype.reset = function () {
    this.lastPattern = [];
    this.lastState   = [];
    this.lastPrediction = {};
    this.lastScore = {};
    this.lastOutput = [];
};

SequenceCoder.prototype.initializeZeros = function () {
    this.stateSpace.initializeZeros();
    return this;
};


/** 
 * Ignites an input bit/symbol, i.e. 
 * denoting by `T` the transition function it computes `T(\emptyset, x)`
 * @function 
 * @param {Symbol} x - A single symbol from the alphabet
 * @return {StateId[]} - A (potentially empty) list of states in the fibre over x 
 */
SequenceCoder.prototype._ignite = function (x) {
    "use strict";
    let ign = this.stateSpace.getZero(x);
    return ign;
};

/** 
 * Alternative version/approach for ignition
 * @function 
 * @param {Symbol} x - A single symbol from the alphabet
 * @return {StateId[]} - A (potentially empty) list of states in the fibre over x 
 */
SequenceCoder.prototype._igniteFibre = function (x) {
    "use strict";
    let ign = this.stateSpace.getFibre(x);
    return ign;
};


/** 
 * Lift the current input to the state space, i.e. compute the next state based on the last prediction.
 * @function 
 * @param {BitId[]} pattern  - A list of symbols (bit ids) from the input alphabet
 * @param {BitId[]} lastPat  - ...
 * @param {StateId[]} lastSt - ...
 * @param {Object} lastPred  - ...
 * @return {Object} - A object of the form { :state, :prediction }
 */
SequenceCoder.prototype._lift = function (pattern, lastPrediction) {
    "use strict";
    let state  = [];

    for (let i = pattern.length - 1; i >= 0; i--) {
        let x       = pattern[i];
        let x_tilde =  x in lastPrediction ? lastPrediction[x]['cells'] : [];

        /* CHECK FOR (FIBRE-WISE) 'DEATH' AND POSSIBLY IGNITE*/
        if (x_tilde.length == 0) { 
            x_tilde = this._ignite(x);
        } 

        /* COMBINE FIBRE-WISE LIFTS TO GET A NEW MULTISTATE*/
        for (let j=x_tilde.length-1; j>= 0; j--) {
                state.push(x_tilde[j]);
        }

    } 
    return state;
};


/** 
 * Extends the (generalized) state space
 * @function 
 * @param {StateId[]} listOfStates - A list of state ids
 * @param {Symbol} x - A single symbol from the alphabet
 * @return {SequenceCoder} - A self reference
 */
SequenceCoder.prototype._extend = function (listOfStates, x) {
    "use strict";
    if(listOfStates.length == 0) {
        if (this._ignite(x).length == 0) { 
            let tilde_x_new = this.stateSpace.createStateOver(x);
            this.stateSpace.addZero(x, tilde_x_new);
        }
    } else {
        let tilde_x_new = this.stateSpace.createStateOver(x);
        this.stateSpace.createSegment(listOfStates, tilde_x_new);
    }
    return this;
};

/** 
 * Increases the weight of Segments (Edges of the state graph) that predicted an input correctly.
 * @function 
 * @param {SegmentId[]} listOfSegments - A (potentially empty) list of segment ids (that correctly predicted an input)
 * @return {SequenceCoder} - A self reference
 */
SequenceCoder.prototype._reinforce = function (lastPrediction, x) {
     "use strict";
    let listOfSegments = x in lastPrediction ? lastPrediction[x]['segments'] : [];
    this.stateSpace.increaseWeights(listOfSegments, this.incr)
    return this;
};

/** 
 * @function 
 */
SequenceCoder.prototype._suppress = function (lastPrediction, pattern) {
     "use strict";
};

/** 
 * Consume a patter 
 * @function 
 * @param {BitId[]} pattern  - A list of symbols (bit ids) from the input alphabet
 * @param {BitId[]} lastPat  - ...
 * @param {StateId[]} lastSt - ...
 * @param {Object} lastPred  - ...
 * @return {Object} - A object of the form { :state, :prediction }
 */
SequenceCoder.prototype._improveTransition = function (pattern, lastState, lastPrediction) {
    "use strict";
    let X  = pattern; 

    for (let i = X.length - 1; i >= 0; i--) {
        let x       = X[i];
        if(!(x in lastPrediction)) {
            let d =  this.segmentDomainSize;
            let domain = pickRandomNFrom(d, lastState)
            logger.debug("improving EXTEND: ", JSON.stringify(domain), x);
            this._extend(domain , x);
            // this._extend(lastState, x);
        } else {
            this._reinforce(lastPrediction, x);
        }
    }

    this._suppress(lastPrediction, pattern)

    return this;
};

/** 
 * Compute prediction 
 * @function 
 * @param {StateId[]} listOfStates - ...
 * @return {Object} - A object of the form { x: { cells, segments, segmentScores, cellScores, segmentweights, cellWeights }
 */
SequenceCoder.prototype._computePrediction = function (listOfStates) {
    "use strict";

    let prediction = {}
    let weights = {}

    let theta = this.theta;
    let stateSpace = this.stateSpace;
    
    let activeSegs = [];
        
    /* Compute segment scores*/
    let scores = {};
    let touchedSegments = [];
    for (let i=listOfStates.length-1; i>=0; i--) {
        let state = listOfStates[i];
        let listeningSegments = stateSpace.listeningSegments[state];
        for (let j=listeningSegments.length-1; j>=0; j--) {
            let seg = listeningSegments[j];

            if(!(seg in scores)) {
                touchedSegments.push(seg);
                scores[seg] = 0;
            } 

            scores[seg] += 1;            
        }
    }

    /* Filter segments by score and return active segments */
    let activeSegments = [];
    for (let i = touchedSegments.length-1; i>=0; i--) {
        let seg = touchedSegments[i];
        if (scores[seg] >= theta) {
            activeSegments.push(seg);
        }
    }

    /* 
     *  we assume that there is only one segment for each state cell
     *  that is a simplifying assumption, it should be satisfied under 
     *  the current learning rule, as long as theta is bigger than k/2?? 
     */
    for (let i = activeSegments.length-1; i>=0; i--) {

        let seg    = activeSegments[i];
        let cell   = stateSpace.listeningCell[seg];
        let base   = stateSpace.getBase(cell);
        let weight = stateSpace.segmentWeights[seg];
        let score  = scores[seg];


        if(!(base in prediction)) {
            prediction[base] = {
                'cells': [], 
                'segments': [],
                'segmentScores':{},
                'cellScores':{},
                'segmentWeights':{},
                'cellWeights':{},
                'weight': 0
            };
        }

        if(!(cell  in prediction[base]['cells'])) { 
            prediction[base]['cells'].push(cell);
            prediction[base]['cellScores'][cell] = score;
            prediction[base]['cellWeights'][cell] = weight;
        } else {
            let oldScore   = prediction[base]['cellScores'][cell];
            prediction[base]['cellScores'][cell] = Math.max(oldScore, score);
            // let oldWeight = prediction[base]['cellWeights'][cell];
            // prediction[base]['cellWeights'][cell] = Math.max(oldWeight, weight);  // Which update rule makes more sense?? 
            prediction[base]['cellWeights'][cell] += weight;
        }

        prediction[base]['segments'].push(seg);
        prediction[base]['segmentScores'][seg]  = score;
        prediction[base]['segmentWeights'][seg] = weight;

        prediction[base]['weight'] += weight; 

    }

    return prediction;
};

/** 
 * @function 
 */
SequenceCoder.prototype.consume = function (pattern, learningIsOn = false) {
    let X              = pattern; 
    let lastState      = this.lastState;
    let lastPrediction = this.lastPrediction;

    if(learningIsOn) {
        this._improveTransition(X, lastState, lastPrediction);
    }

    let newState      = this._lift(pattern, lastPrediction);
    let newPrediction = this._computePrediction(newState);
    let newOutput     = this._computeOutput(this.lastPrediction, this.lastScore, newState);


    this.lastState      = newState;
    this.lastPrediction = newPrediction;
    this.lastOutput     = newOutput;

    return newOutput; 
};

/** 
 * @function 
 */
SequenceCoder.prototype.learn = function (pattern) {
    return this.consume(pattern, true);
};

/** 
 * @function 
 */
SequenceCoder.prototype._computePredictionAccuracy = function (lastPrediction, state) {
    "use strict";

    var total = 0;
    for(let x in lastPrediction) {
        total += lastPrediction[x]['weight'];
    }
    
    let n = this.inputRange;
    var getBase = s => this.stateSpace.getBase(s);
    var scoreList = state.map(s => {
        let x  = getBase(s);
        let cx = 1/lastPrediction[x]['cells'].length;
        if(x in lastPrediction) { 
           return (lastPrediction[x].cellWeights[s] + cx)/(total + n);
        } else {
           return 1/(total + n);
        }
    });

    return scoreList;
};

/** 
 * @function 
 */
SequenceCoder.prototype._computeStateFeedback = function (lastPrediction, state) {
    "use strict";

    var total = 0;
    for(let x in lastPrediction) {
        total += lastPrediction[x]['weight'];
    }
    
    let n = this.inputRange;
    var getBase = s => this.stateSpace.getBase(s);
    var scoreList = state.map(s => {
        let x  = getBase(s);
        let cx = 1/lastPrediction[x]['cells'].length;
        if(x in lastPrediction) { 
           return (lastPrediction[x].cellWeights[s] + cx)/(total + n);
        } else {
           return 1/(total + n);
        }
    });

    return scoreList;
};

/** 
 * @function 
 */
SequenceCoder.prototype._computeOutput = function (lastPrediction, lastScore, state) {
    "use strict";

 
};

/** 
 * @function 
 */
SequenceCoder.prototype._basePredictionScore = function (lastPrediction, lastScore, state) {
    "use strict";

    let total = 0;
    for(let x in lastPrediction) {
        total += lastPrediction[x]['weight'];
    }
    
    let getBase = s => this.stateSpace.getBase(s);
    let basePattern = Array.from(new Set(state.map(getBase)));
    let n = this.inputRange;
    let scoreList = basePattern.map(x => {
        if(x in lastPrediction) 
            return (lastPrediction[x]['weight'] + 1)/(total + n);
        else 
            return 1/(total + n);
    });

    return scoreList;
};


/** 
 * @function 
 */
SequenceCoder.prototype._baseProjection = function (listOfStates) {
    "use strict";
    let getBase = this.stateSpace.getBase;
    return Array.from(new Set(listOfStates.map(getBase)));
};


SequenceCoder.prototype._predict = SequenceCoder.prototype._computePrediction;





module.exports = SequenceCoder;








