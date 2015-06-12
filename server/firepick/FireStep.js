var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
Bernstein = require("./Bernstein");
Tridiagonal = require("./Tridiagonal");
PHFactory = require("./PHFactory");
PH5Curve = require("./PH5Curve");
PHFeed = require("./PHFeed");
PnPPath = require("./PnPPath");
DeltaCalculator = require("./DeltaCalculator");
XYZPositioner = require("./XYZPositioner");

(function(firepick) {
	var logger = new Logger();
	var nullWriter = function(msg) {};

    function FireStep(options) {
		var that = this;

		options = options || {};
		that.delta = options.delta || new DeltaCalculator({
			steps360: options.steps360 == null ? 400 : options.steps360,
			microsteps: options.microsteps == null ? 16 : options.microsteps,
		});
		that.delta.should.instanceof(DeltaCalculator);
		that.write = options.write || nullWriter;
		that.position = options.position || {x:0,y:0,z:0};
		that.hCruise = options.hCruise == null ? 20 : options.hCruise;
		var revPulses = that.delta.steps360*that.delta.microsteps;
		that.vMax = options.vMax || 2*revPulses;
		that.vMax.should.above(0);
		that.tvMax = options.tvMax || 0.4;
		that.tvMax.should.above(0);

		return that;
    };

	///////////////// INSTANCE API ///////////////
	FireStep.prototype.health = function() {
		return 1;
	}
	FireStep.prototype.home = function() {
		var that = this;
		var cmd = {
			hom:{
				x:that.delta.homePulses.p1,
				y:that.delta.homePulses.p2,
				z:that.delta.homePulses.p3,
			}
		};
		that.write(JSON.stringify(cmd));
		that.write("\n");
		that.position = that.delta.calcXYZ(that.delta.homeAngles);
		return that;
	}
	FireStep.prototype.getXYZ = function() {
		var that = this;
		return that.position;
	}
	FireStep.prototype.move = function(xyz) {
		var that = this;
		if (xyz instanceof Array) {
			for (var i=0; i<xyz.length; i++) {
				that.move(xyz[i]);
			}
			return that;
		}
		var dst = {
			x: xyz.x == null ? that.position.x : xyz.x,
			y: xyz.y == null ? that.position.y : xyz.y,
			z: xyz.z == null ? that.position.z : xyz.z,
		};
		var pulses = that.delta.calcPulses(dst);
		var cmd = {
			mov:{
				x:pulses.p1,
				y:pulses.p2,
				z:pulses.p3,
			}
		};
		that.write(JSON.stringify(cmd));
		that.write("\n");
		that.position = dst;
		return that;
	}
	FireStep.prototype.origin = function() {
		var that = this;
		that.home();
		that.move({x:0,y:0,z:0});
		return that;
	}
	FireStep.prototype.jumpTo = function(xyz) {
		var that = this;
		var dst = {
			x: xyz.x == null ? that.position.x : xyz.x,
			y: xyz.y == null ? that.position.y : xyz.y,
			z: xyz.z == null ? that.position.z : xyz.z,
		};
		var pnp = new PnPPath(that.position, dst, {
			hCruise: that.hCruise
		});
		var waypoints = pnp.waypointPulses(that.delta);
		var pts1 = [];
		var pts2 = [];
		var pts3 = [];
		var dIm = 1000; 
		for (var i=0; i<waypoints.length; i++) {
			//logger.info("waypoints[",i,"]:", waypoints[i]);
			pts1.push({re:waypoints[i].p1, im:i*dIm});
			pts2.push({re:waypoints[i].p2, im:i*dIm});
			pts3.push({re:waypoints[i].p3, im:i*dIm});
		}
		var feedOpts = {vMax:that.vMax, tvMax:that.tvMax};
		var ph1 = new PHFactory(pts1).quintic();
		var ph2 = new PHFactory(pts2).quintic();
		var ph3 = new PHFactory(pts3).quintic();
		var ph = ph1.s(1) > ph2.s(1) ? ph1 : ph2;
		ph = ph.s(1) > ph3.s(1) ? ph : ph3;
		var phf = new PHFeed(ph, feedOpts);
		var N = 128;
		var E = phf.Ekt(0,0);
		var posPulses = that.delta.calcPulses(that.position);
		var r1Prev = posPulses.p1;
		var r2Prev = posPulses.p2;
		var r3Prev = posPulses.p3;
		var v1 = 0;
		var v2 = 0;
		var v3 = 0;
		for (var i=1; i<=N; i++) {
			var tau = i/N;
			E = phf.Ekt(E, tau);
			var r1 = Math.round(ph1.r(E).re);
			var r2 = Math.round(ph2.r(E).re);
			var r3 = Math.round(ph3.r(E).re);
			var dr1 = r1 - r1Prev;
			var dr2 = r2 - r2Prev;
			var dr3 = r3 - r3Prev;
			var dv1 = dr1 - v1;
			var dv2 = dr2 - v2;
			var dv3 = dr3 - v3;
			//logger.info("i:", i, " tau:", tau, " r1:", r1, " r2:", r2, " r3:", r3,
				//" dv1:", dv1, " dv2:", dv2, " dv3:", dv3);
			v1 += dv1;
			v2 += dv2;
			v3 += dv3;
		}
		return that;
	}

	///////////////// CLASS //////////
	FireStep.setLogger = function(value) {
		should(value.info)
		logger = value;
	}
	FireStep.getLogger = function() {
		return logger || new Logger();
	}

    Logger.logger.info("loaded firepick.FireStep");
    module.exports = firepick.FireStep = FireStep;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.FireStep", function() {
	var logger = new Logger({
		nPlaces:1,
		logLevel:"info"
	});
	var FireStep = firepick.FireStep;
	var pt1 = {x:10, y:20, z:-50};
	var pt2 = {x:-90, y:21, z:-60};
	var e = 0.000001;
	var testOut = "";
	var testWrite = function(msg) {testOut += msg;};

	function testCmd(cmd, expected) {
		testOut = "";
		cmd();
		testOut.should.equal(expected);
	}
	function shouldEqualT(a,b,tolerance) {
		tolerance = tolerance || 0.001;
		for (var k in a) {
			var msg = "shouldEqualT({" + k + ":" + a[k] 
				+ "}, {" + k + ":" + b[k] + "} FAIL";
			a[k].should.within(b[k]-tolerance, b[k]+tolerance, msg);
		}
	}
	it("has a DeltaCalculator option", function() {
		new FireStep().delta.should.instanceof(DeltaCalculator);
		var dc = new DeltaCalculator();
		new FireStep({delta:dc}).delta.should.equal(dc);
	});
	it("has position option", function() {
		shouldEqualT(new FireStep().position, {x:0,y:0,z:0});
		shouldEqualT(new FireStep({position:{x:1,y:2,z:3}}).position, {x:1,y:2,z:3});
	});
	it("has a cruise height (mm) option", function() {
		new FireStep().hCruise.should.equal(20);
		new FireStep({hCruise:21}).hCruise.should.equal(21);
	});
	it("has maximum velocity (pulses/second) option", function() {
		new FireStep().vMax.should.equal(12800);
		new FireStep({vMax:20000}).vMax.should.equal(20000);
	});
	it("has seconds to maximum velocity option", function() {
		new FireStep().tvMax.should.equal(0.4);
		new FireStep({tvMax:0.7}).tvMax.should.equal(0.7);
	});
	it("has a write() option", function() {
		new FireStep().write.should.be.Function;
		new FireStep({write:testWrite}).write("hello");
		testOut.should.equal("hello");
	});
	it("should implement home()", function() {
		var fs = new FireStep({write:testWrite});
		testCmd(function(){ fs.home(); },'{"hom":{"x":-11200,"y":-11200,"z":-11200}}\n');
		shouldEqualT(fs.position, fs.delta.calcXYZ(fs.delta.homeAngles));
	});
	it("should implement getXYZ()", function() {
		shouldEqualT(new FireStep().getXYZ(), {x:0,y:0,z:0});
		shouldEqualT(new FireStep({position:{x:1,y:2,z:3}}).getXYZ(), {x:1,y:2,z:3});
	});
	it("should implement move()", function() {
		var fs = new FireStep({write:testWrite});
		testCmd(function(){ fs.move({x:1,y:2,z:3}); },
			'{"mov":{"x":-227,"y":-406,"z":-326}}\n'
		);
		shouldEqualT(fs.getXYZ(),{x:1,y:2,z:3});
		testCmd(function(){ fs.move({x:0,y:0,z:0}); },
			'{"mov":{"x":0,"y":0,"z":0}}\n'
		);
		shouldEqualT(new FireStep().getXYZ(), {x:0,y:0,z:0});
	});
	it("should implement origin()", function() {
		var fs = new FireStep({write:testWrite});
		testCmd(function(){ fs.origin(); },
			'{"hom":{"x":-11200,"y":-11200,"z":-11200}}\n' +
			'{"mov":{"x":0,"y":0,"z":0}}\n'
		);
		shouldEqualT(fs.getXYZ(), {x:0,y:0,z:0});
	});
	it("TESTTESTshould implement XYZPositioner", function() {
		XYZPositioner.validate(new FireStep());
	});
	it("TESTTESTjumpTo() should traverse pick and place path", function() {
		var fs = new FireStep({write:testWrite});
		fs.move({x:100,y:0,z:-70});
		testCmd(function(){ fs.jumpTo({x:-100,y:0,z:-80}); },
			''
		);
	});
})
