console.log("Declaring firepick");
var module = module || {};		/* nodejs module */
var firepick = firepick || {};	/* browser module*/
module.exports = firepick;

firepick.Calibrate = require('./Calibrate.js');
firepick.GCodeDriver = require('./GCodeDriver.js');
