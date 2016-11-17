var logger = require('winston');
// var logger = require('./logger.js')
var chalk = require('chalk');
var _ = require('lodash');

logger.level = 'debug';

/*
 * 
 * 
 *
 */
var StateSpace = function (obj = {}) {
    let config = Object.assign({ 
            initialWeight: 1, 
            theta:         1,
            alphabet:    [0,1],
            stateRange:    10,
            segsPerState:  20
    }, obj);


    this.initialWeight = config.initialWeight ;
    this.inputRange    = config.alphabet.length;
    this.alphabet      = config.alphabet;
    this.theta         = config.theta;
    this.stateRange    = config.stateRange;
    this.segsPerState  = config.segsPerState;

    this.zero        = {};
    this.fibre       = {};
    this.base        = {}; 
    this.states      = [];
    this.segments    = [];
    this.numStates   = 0;
    this.numSegments = 0;

    // this.geoHeight = {};

    this.listeningSegments = {};
    this.feedingSegments   = {};
    this.listeningCell     = {};
    this.feedingCells      = {}; 
    this.feedingCellsObj   = {}; 
    this.segmentWeights    = {}

    this.alphabet.forEach(x => {
        let statesOverX = _.range(this.stateRange).map(y => y + x*this.stateRange);
        this.fibre[x] = statesOverX;
        this.states.push(...statesOverX);
    });

    this.states.forEach(s => {
        let SegsOverS = _.range(this.segsPerState).map(k => k + s*this.segsPerState);
        this.feedingSegments[s] = SegsOverS;
        this.listeningSegments[s] = [];
        this.segments.push(...SegsOverS);
    });

    this.segments.forEach(s => {
        this.segmentWeights[s] = this.initialWeight;
        this.feedingCellsObj[s] = {}
        this.feedingCells[s] = [];
    });
};

StateSpace.fromSerialized = function (dataObj) {
    "use strict";
    let newStateSpace =  new StateSpace();
    Object.assign(newStateSpace, dataObj);
    return newStateSpace;
};

StateSpace.prototype.generateStateId = function (base) {
    "use strict";

    return Math.floor(Math.random() * this.stateRange + base*this.stateRange);
};

StateSpace.prototype.generateSegmentId = function (source, target) {
    "use strict";
    return Math.floor(Math.random() * this.segsPerState + target*this.segsPerState);
};

StateSpace.prototype.initializeZeros = function () {
    "use strict";
    for(var x of this.alphabet) { 
        if(!(x in this.zero)) {
            let id = this.generateStateId(x)
            this.zero[x] = [id]; 
            // this.addStateOver(x, id)
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
    // let state = this.generateStateId(base);
    // logger.debug("create new state: ", base, state)
    // this.addStateOver(base, state);
    return  Math.floor(Math.random() * this.stateRange + base*this.stateRange);
};

StateSpace.prototype.createSegment = function (listOfStates, singleState) {
    "use strict";
    // choose random segemnts from feedingsegements of singleState
    // add listOfStates to its domain
    var seg = this.generateSegmentId(listOfStates, singleState);

    if(singleState instanceof Array) throw "single state shouldn't be a list";
    // this.segments.push(seg);
    // this.segmentWeights[seg] = this.initialWeight;
    listOfStates.forEach(st => {
        if(!(st in this.feedingCellsObj[seg])) {
            this.feedingCells[seg].push(st);
            this.feedingCellsObj[seg][st] = true;
        }
    });



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

