var module = module || {};	/* nodejs module */
var firepick;				/* browser module*/

function isNumeric(obj) {
    return !jQuery.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
}

(function (firepick) {
	function GCodeDriverTest() {
	}
	firepick.GCodeDriverTest = GCodeDriverTest;
})(firepick || (firepick={}));

console.log("Declaring firepick.GCodeDriver");
(function (firepick) {
	function GCodeDriver() {
		this.feedRate = 6000;
		this.sync = "M400";
		this.write = function(cmd) {
			console.log(cmd);
		}
		return this;
	}
	GCodeDriver.prototype.withSync = function(sync) {	// M400: Wait for move to finish
		this.sync = sync;
		return this;
	}
	GCodeDriver.prototype.withFeedRate = function(feedRate) { // Fxxx: Feed rate in mm/min
		this.feedRate = feedRate;
		return this;
	}
	GCodeDriver.prototype.home = function() {
		this.write("G28");
		this.write("G0Z0F" + this.feedRate + this.sync);
		return this;
	}
	GCodeDriver.prototype.moveTo = function(x,y,z) {
		var coord = (isNumeric(x) ? ("X" + x) : "")
			+ (isNumeric(y) ? ("Y"+y) : "")
			+ (isNumeric(z) ? ("Z"+z) : "");
		this.write("G0"+coord + this.sync);
	}
	GCodeDriver.prototype.test = function() {
		
	}

	console.log("firepick.GCodeDriver defined");
	firepick.GCodeDriver = GCodeDriver;
})(firepick || (firepick={}));

module.exports = firepick.GCodeDriver;
