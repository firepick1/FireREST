var module = module || {};	/* nodejs module */
var firepick;				/* browser module*/
var GCodeDriver = require("./GCodeDriver.js");

console.log("Declaring firepick.Calibrate");
(function (firepick) {
	var globalId = 100;
	function Calibrate(gcode) {
		this.id = globalId++;
		this.gcode = gcode || new GCodeDriver();
		return this;
	}
	Calibrate.prototype.getId = function() {
		return this.id;
	}
	Calibrate.prototype.measureFeedRate = function() {
		console.log("measuringing feed rate");
		this.gcode.home();
	}

	console.log("firepick.Calibrate defined");
	firepick.Calibrate = module.exports = Calibrate;
})(firepick || (firepick={}));


