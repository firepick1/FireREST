var should = require("should"), module = module || {}, firepick;			

var GCodeDriver = require("./GCodeDriver.js");

(function (firepick) {
	function Calibrate(gcode) {
		this.gcode = gcode || new GCodeDriver();
		return this;
	}
	Calibrate.prototype.measureFeedRate = function() {
		this.gcode.home();
		return this;
	}

	console.log("firepick.Calibrate");
	module.exports = firepick.Calibrate = Calibrate;
})(firepick || (firepick={}));

(typeof describe === 'function') && describe("firepick.Calibrate test", function() {
	var output;
	function testWriter(cmd) {
		output = output ? (output + ";" + cmd) : cmd;
	}
	var gcode = new GCodeDriver().withWriter(testWriter);
	var cal = new firepick.Calibrate(gcode);
	function assertCommand(result, expected) {
		should(result).equal(cal, "expected fluent call returning cal object");
		should(output).equal(expected);
		output = undefined;
	}

	it("should measureFeedRate", function() {
	});

});


