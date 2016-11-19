



let add = (a,b) => a + b;

let predictionError = function (pred, sdr) {
	let potentiallyWrong  =  Object.keys(pred).length + sdr.length 
	let correct = sdr
				   .map(i => i in predObj ? 0 : 1 )
				   .reduce(add);

	return potentiallyWrong - 2*correct; 
};

let fractionOfPredictionErrors = function (inputRange, predictions, inputs) {
	let sumOfErrors = inputs
						.map((sdr,i) => predictionError(predictions[i], sdr))
						.reduce(add);
	return sumOfErrors/inputRange;
};























module.exports = { fractionOfPredictionErrors };