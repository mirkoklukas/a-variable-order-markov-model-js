var logger = require('winston');
// var logger = require('./logger.js')
var chalk = require('chalk');

logger.level = 'debug';

/*
 * 
 * 
 *
 */
var StateSpace = function (obj = {}) {
    let config = Object.assign({ 
            initialWeight: 1, 
            alphabet:      []
    }, obj);

    this.initialWeight = config.initialWeight ;
    this.alphabet      = config.alphabet;

    this.zero     = {};
    this.fibre    = {};
    this.base     = {}; 
    this.states   = [];
    this.segments = [];
    this.numStates = 0;
    this.numSegments = 0;

    // this.geoHeight = {};

    this.listeningSegments = {};
    this.feedingSegments   = {};
    this.listeningCell     = {};
    this.feedingCells      = {}; 
    this.segmentWeights    = {}


    for(var x of this.alphabet) { 
        if(!(x in this.fibre)) {
            this.fibre[x] = [];
        }
    }

};

StateSpace.fromSerialized = function (dataObj) {
    "use strict";
    let newStateSpace =  new StateSpace();
    Object.assign(newStateSpace, dataObj);
    return newStateSpace;
};

StateSpace.prototype.generateStateId = function (base) {
    "use strict";
    this.numStates += 1;
    return base + '.' + this.fibre[base].length;
};

StateSpace.prototype.generateSegmentId = function (source, target) {
    "use strict";
    this.numSegments += 1;
    return this.numSegments;
};

StateSpace.prototype.initializeZeros = function () {
    "use strict";
    for(var x of this.alphabet) { 
        if(!(x in this.zero)) {
            let id = this.generateStateId(x)
            this.zero[x] = [id]; 
            this.addStateOver(x, id)
        }
    }
    return this;
}

StateSpace.prototype.getZero= function (x) {
    return x in this.zero ? this.zero[x] : [];
};

StateSpace.prototype.addZero= function (x, state) {
    if (x in this.zero) {
        this.zero[x].push(state)
    } else {
        this.zero[x] = [state]
    }
    return this;
};

StateSpace.prototype.getBase = function (stateId) {
    return this.base[stateId];
};


StateSpace.prototype.getFibre = function (x) {
    return this.fibre[x];
};

StateSpace.prototype.addStateOver = function (base, state) {
    this.states.push(state);
    // this.geoHeight[state] = Math.random();

    this.fibre[base].push(state);
    this.base[state] = base;
    this.listeningSegments[state] = [];
    this.feedingSegments[state] = [];
    return this;
};

StateSpace.prototype.addListOfStatesOver = function (base, states) {
    states.forEach(s => this.addStateOver(base, s))
    return this;
};

StateSpace.prototype.createStateOver = function (base) {
    "use strict";
    let state = this.generateStateId(base);
    logger.debug("create new state: ", base, state)
    this.addStateOver(base, state);
    return state;
};

StateSpace.prototype.createSegment = function (listOfStates, singleState) {
    "use strict";
    logger.debug("create new segment: ", listOfStates, singleState)
    if(singleState instanceof Array) throw "single state shouldn't be a list";
    var seg = this.generateSegmentId(listOfStates, singleState);
    this.segments.push(seg);
    this.segmentWeights[seg]  = this.initialWeight;
    this.segmentActivities[seg] = this.initialWeight;
    this.feedingCells[seg] = listOfStates;
    this.listeningCell[seg] = singleState;
    this.feedingSegments[singleState].push(seg);
    for (let i=listOfStates.length-1; i>=0; i--) {
        let feedState=listOfStates[i];
        this.listeningSegments[feedState].push(seg);
    }
    return seg;
};


StateSpace.prototype.increaseWeights = function (listOfSegments, weight) {
    "use strict";
    for (let i=listOfSegments.length - 1; i>=0; i--) {
        let seg = listOfSegments[i];
        this.segmentWeights[seg] += weight
    }
    return this;
};


StateSpace.prototype.increaseActivities= function (listOfSegments, weight) {
    "use strict";
    for (let i=listOfSegments.length - 1; i>=0; i--) {
        let seg = listOfSegments[i];
        this.segmentActivities[seg] += weight
    }
    return this;
};


/** 
 * Helper
 */
let histogrammerFac = function (mutate, init) {
    return function (obj, key) {
        if(key in obj) obj[key] = mutate(obj[key]);
        else obj[key] = init;
        return obj;
    };
};
let histogrammer = histogrammerFac(x => x + 1, 0);
let concat = (a,b) => a.concat(b);


/** 
 * @function 
 */
StateSpace.prototype._reconstructPreviousState = function (listOfStates) {
    "use strict"; 
    let getFeedingSegs = st => this.feedingSegments[st];
    let getFeedingCells = seg => this.feedingCells[seg];

    let reconstructionScores = 
            listOfStates
                .map(getFeedingSegs)
                .reduce(concat, [])
                .map(getFeedingCells)
                .reduce(concat, [])
                .reduce(histogrammer, {});

    return reconstructionScores;
};



/*
 *
 */
module.exports = StateSpace

