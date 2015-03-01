var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var os = require("os"),
	fs = require("fs"),
	child_process = require("child_process"),
	path = require("path");
firepick.XYZPositioner = require("./XYZPositioner");
firepick.Camera = require("./Camera");
firepick.ImageRef = require("./ImageRef");
firepick.ImageStore = require("./ImageStore");

(function(firepick) {
    function FireSight() {
        return this;
    };

	//////////// CLASS //////////////
	FireSight.validate = function(firesight) {
		describe("validating calcOffset", function() {
			it("should calculate the offset between two images at the same location", function() {
				var diff = firesight.calcOffset("test/camX0Y0Z0a.jpg","test/camX0Y0Z0b.jpg");
				should.equal(0, diff.dx);
				should.equal(0, diff.dy);
				should(diff.match).above(0.99);
			});
			it("should calculate the offset between two images at the different locations", function() {
				var diff = firesight.calcOffset("test/camX0Y0Z0a.jpg","test/camX1Y0Z0.jpg");
				should.equal(-5, diff.dx);
				should.equal(1, diff.dy);
				should(diff.match).above(0.9);
			});
			it("should calculate the offset between two dissimilar images", function() {
				var diff = firesight.calcOffset("test/camX0Y0Z0a.jpg","test/duck.jpg");
				should.not.exist(diff);
			});
		});
		describe("validating meanStdDev", function() {
			it("should calculate the mean and standard deviation of an image", function() {
				var msd = firesight.meanStdDev("test/camX0Y0Z0a.jpg");
				should.deepEqual(msd, {
					"mean":[ 252.6633875, 254.64116250000001, 251.63050625000002, 0.0 ],
					"stdDev":[ 2.1166523155330208, 1.9238660682581448, 9.6636286206944533, 0.0 ]
			    });
			});
		});
		describe("validating sharpness", function() {
			it("should calculate the sharpness of an image", function() {
				var sharp = firesight.sharpness("test/camX0Y0Z0a.jpg");
				should.deepEqual(sharp, {
					"sharpness":3.0546240601503762
				});
			});
		});
	};

	/////////////////// INTERNAL ////////////////////////
	function firesight_cmd(fname1, pipeline, args) {
		var cmd = "firesight -i " + fname1 + " -p server/json/" + pipeline;
		if (args) {
			cmd += " " + args;
		}
		//console.log(cmd);
		var out = child_process.execSync(cmd);
		return JSON.parse(out.toString());
	};
	FireSight.prototype.calcOffset = function(fname1, fname2) {
		var jout = firesight_cmd(fname1, "calcOffset.json", "-Dtemplate=" + fname2);
		return jout.result.channels['0'];
	};
	FireSight.prototype.meanStdDev = function(fname1) {
		var jout = firesight_cmd(fname1, "meanStdDev.json");
		return jout.result;
	};
	FireSight.prototype.sharpness = function(fname1) {
		var jout = firesight_cmd(fname1, "sharpness.json");
		return jout.result;
	};

    console.log("LOADED	: firepick.FireSight");
    module.exports = firepick.FireSight = FireSight;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FireSight test", function() {
	var firesight = new firepick.FireSight();
	firepick.FireSight.validate(firesight);
});
