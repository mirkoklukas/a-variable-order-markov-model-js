var argv = require('minimist')(process.argv.slice(2));
var chalk = require('chalk');



var argvee = (function (argv, process) {
	var expectations;
	var arg = Object.assign({}, argv);
	var unflagged;
	var mandatory;
	var mandatoryFlagged;
	var mandatoryUnflagged;
	var annotated= [];
	var missing;
	var exampleUsage;
	var self;
	var node = process.argv[0].split("/").slice(-1).join("");
	var script = process.argv[1].split("/").slice(-1).join("");

	var printUsage = function () {
		var usage = expectations.map(x => 
						x.optional ? `[${x.name}]`: `${x.name}`);

		return chalk.bold(`Usage:\n`) + [ `${node} ${script}`, ...usage.map(x => chalk.underline(x))].join(" ") 
	};

	var printExample = function () {
		return chalk.bold(`...e.g.\n`) + exampleUsage;
	};

	var printWhatsMissing = function () {
		return chalk.bold(`...missing \n`) + missing.map(x => x.name).join("\n");
	};

	var printInputDescr = function () {
		return chalk.bold(`...where\n`) + 
				annotated.map(e => {
					let type        = 'type' in e ? e.type : '   ';
					let optional    = 'optional' in e ? e.optional : false;
					let description = 'description' in e ? e.description : '';
					return `${chalk.dim(type)}  ${e.name} ${optional? '(optional)': '(required)'} ${description}`;
				}).join('\n');
	};

	var isRoughlyOk = function () {
		missing = mandatory.filter(opt => arg[opt.name] === undefined);
		return missing.length == 0;
	};

	var apply = function () {
		if(!isRoughlyOk()) {
			console.log();
			console.log(printUsage());
			console.log();
			console.log(printInputDescr());
			console.log();
			// console.log(printWhatsMissing())
			// console.log()
			if(exampleUsage != undefined) {
				console.log(printExample());
				console.log();
			}
			process.exit(-1);
		} 
		return arg;
	};

	var example = function (ex) {
		exampleUsage = `${node} ${script} ${ex.map(x => chalk.underline(x)).join(" ")}`;
		return self;
	};

	var expect = function (exps) {
		expectations = exps.map(e => {
			if(typeof e == 'string') {
				return { 'name': e };
			}
			else {
				annotated.push(e);
				return e;
			}
		});
		unflagged          = expectations.filter(e => !('flag' in e) || !e.flag);
		mandatory          = expectations.filter(e => !('optional' in e) || !e.optional );
		mandatoryUnflagged = mandatory.filter(e => !('flag' in e) || !e.flag);
		mandatoryFlagged   = mandatory.filter(e => ('flag' in e) && e.flag);

		unflagged.forEach((opt,i) => {
			if(i < argv._.length) {
				arg[opt.name] = argv._[i];
			}
		});

		return self;
	};
	self = {expect, example, apply}
	return self;
}(argv, process));


module.exports = argvee;
