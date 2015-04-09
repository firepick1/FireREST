var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
PHFactory = require("./PHFactory");
PH5Curve = require("./PH5Curve");
PHFeed = require("./PHFeed");
DeltaCalculator = require("./DeltaCalculator");

(function(firepick) {
    function PHDelta(options) {
		var that = this;

		options = options || {};
		that.N = options.N || 6;
		that.delta = options.delta || new DeltaCalculator(options);
		that.logger = options.logger || new Logger(options);

		return that;
    };

	///////////////// INSTANCE API ///////////////
	PHDelta.prototype.thetaPH = function(xyz) {
		var that = this;
		xyz.length.should.above(1);
		var xy = [];
		var xz = [];
		for (var i=0; i<xyz.length; i++) {
			xy.push(new Complex(xyz.x, xyz.y));
			xz.push(new Complex(xyz.x, xyz.z));
		}
		var xyPH = new PHFactory(xy).quintic();
		var xzPH = new PHFactory(xz).quintic();
		var theta = [];
		var theta12 = [];
		var theta13 = [];
		var theta23 = [];
		for (var i=0; i < that.N; i++) {
			var ixy = xyPH.r(i/(that.N-1));
			var ixz = xyPH.r(i/(that.N-1)); // TODO use time, not parameter
			var pt = {x:ixy.re,y:ixy.im,z:ixz.im};
			var angles = that.delta.calcAngles(pt);
			theta.push(angles);
			theta12.push(new Complex(angles.theta1,angles.theta2));
			theta13.push(new Complex(angles.theta1,angles.theta3));
			theta23.push(new Complex(angles.theta2,angles.theta3));
		}
		var result = {
			ph12:new PHFactory(theta12).quintic(),
			ph13:new PHFactory(theta13).quintic(),
			ph23:new PHFactory(theta23).quintic(),
		}
		return result;
	};

    Logger.logger.info("loaded firepick.PHDelta");
    module.exports = firepick.PHDelta = PHDelta;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.PHDelta", function() {
	var logger = new Logger({
		nPlaces:1,
		logLevel:"debug"
	});
	var epsilon = 0.000001;
	var PHDelta = firepick.PHDelta;
	function shouldEqualT(c1,c2,epsilon) { 
		epsilon = epsilon || 0.001; 
		c1.should.instanceof(Complex);
		c2.should.instanceof(Complex);
		c1.isNear(c2, epsilon).should.equal(true, 
			"expected:" + c2.stringify({nPlaces:3}) +
			" actual:" + c1.stringify({nPlaces:3}));
	};
	it("TESTTESTshould have a default constructor", function() {
		var phd = new PHDelta();
		var phdOptions = new PHDelta({
			e:115,	 	// OPTION: effector equilateral triangle side
        	f:457.3,	// OPTION: base equilateral triangle side
			re:232, 	// OPTION: effector arm length
			rf:112, 	// OPTION: base arm length
			N:6,		// OPTION: number of PH points
		});
		phd.delta.should.instanceof(DeltaCalculator);	// OPTION: you can provide a DeltaCalculator or specify your own
		phd.delta.e.should.equal(phdOptions.delta.e);
		phd.delta.f.should.equal(phdOptions.delta.f);
		phd.delta.re.should.equal(phdOptions.delta.re);
		phd.delta.rf.should.equal(phdOptions.delta.rf);
		phd.delta.dz.should.equal(phdOptions.delta.dz);	// OPTION: specify z-origin offset (default is -z@theta(0,0,0))
		phd.N.should.equal(phdOptions.N);
	});
	it("TESTTESTthetaPH([xyz]) should calculate the theta1..3 quintics for a series of XYZ points", function() {
		var phd = new PHDelta();
		var tph = phd.thetaPH([
			{x:0,y:0,z:-50},
			{x:90,y:0,z:-50},
		]);
	});
})
