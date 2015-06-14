var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
Bernstein = require("./Bernstein");
Tridiagonal = require("./Tridiagonal");
PHFactory = require("./PHFactory");
PH5Curve = require("./PH5Curve");
DeltaCalculator = require("./DeltaCalculator");

(function(firepick) {
	var logger = new Logger();

    function PnPPath(pt1,pt2,options) {
		var that = this;

		pt1.should.have.properties(['x','y','z']);
		pt2.should.have.properties(['x','y','z']);
		that.pt1 = pt1;
		that.pt2 = pt2;

		options = options || {};
		that.hCruise = options.hCruise == null ? 20 : options.hCruise;
		that.tauTakeoff = options.tauTakeoff == null ? 0.1 : options.tauTakeoff;
		that.tauLanding = options.tauLanding == null ? 0.9 : options.tauLanding;
		var homeLocus = options.homeLocus ? options.homeLocus : {};
		that.homeLocus = {
			x:homeLocus.x == null ? 0 : homeLocus.x,
			y:homeLocus.y == null ? 0 : homeLocus.y,
			r:homeLocus.r == null ? 70 : homeLocus.r,
		};

		that.tauTakeoff.should.within(0,0.5);
		that.tauLanding.should.within(0.5,1);

		that.apogee = {
			z:Math.max(that.pt1.z,that.pt2.z) + that.hCruise,
		};
		that.waypointsXY = PnPPath.waypointsXY(that.pt1, that.pt2, that.homeLocus, that.hCruise);
		that.tauCruise = (that.tauLanding-that.tauTakeoff);
		logger.debug("calculating PH5Curve for z");
		var scale=10;
		var dz = scale*Math.abs(pt2.z-pt1.z);
		that.phz = new PHFactory([
			{x: that.pt1.z,y:0},
			{x: that.apogee.z,y:0.5*dz},
			{x: that.pt2.z,y:dz},
		]).quintic();
		logger.debug("calculating PH5Curve for x,y");
		var xypts = [];
		var N = that.waypointsXY.length;
		for (var i=0; i<N; i++) {
			xypts.push({
				x:that.waypointsXY[i].x, 
				y:that.waypointsXY[i].y,
				z:that.phz.r(i/(N-1)).re
			});
		}
		that.phxy = new PHFactory(xypts).quintic();

		return that;
    };

	///////////////// INSTANCE API ///////////////
	PnPPath.prototype.position = function(tau) {
		var that = this;
		var x = that.pt1.x;
		var y = that.pt1.y;
		var z = that.pt1.z;
		if (tau <= that.tauTakeoff) {
			return {x: that.pt1.x, y: that.pt1.y, z:that.phz.r(tau).re};
		}
		if (tau >= that.tauLanding) {
			return {
				x: that.pt2.x, 
				y: that.pt2.y, 
				z: tau >= 1 ? that.pt2.z : that.phz.r(tau).re
			};
		}

		// the XY PH5Curve spans tauTakeoff, not tau
		var tauxy = (tau-that.tauTakeoff) / that.tauCruise;
		var xy = that.phxy.r(tauxy);

		return {x:xy.re,y:xy.im,z:that.phz.r(tau).re};
	};
	PnPPath.prototype.waypointAngles = function(deltaCalculator, sampleScale) {
		var that = this;
		var waypoints = [];
		var nTakeoff = 1/that.tauTakeoff;
		if (sampleScale == null) {
			sampleScale = (nTakeoff+1)/nTakeoff;
		}
		var N = Math.ceil(sampleScale*nTakeoff);
		for (var i=0; i<=N; i++) {
			var xyz = that.position(i/N);
			var angles = deltaCalculator.calcAngles(xyz);
			logger.debug("i:", i, " xyz:", xyz, " angles:", angles);
			waypoints.push(angles);
		}
		return waypoints;
	}
	PnPPath.prototype.waypointPulses = function(deltaCalculator, sampleScale) {
		var that = this;
		var waypoints = [];
		var nTakeoff = 1/that.tauTakeoff;
		if (sampleScale == null) {
			sampleScale = (nTakeoff+1)/nTakeoff;
		}
		var N = Math.ceil(sampleScale*nTakeoff);
		for (var i=0; i<=N; i++) {
			var xyz = that.position(i/N);
			var pulses = deltaCalculator.calcPulses(xyz);
			logger.debug("i:", i, " xyz:", xyz, " pulses:", pulses);
			waypoints.push(pulses);
		}
		return waypoints;
	}

	///////////////// CLASS //////////
	PnPPath.setLogger = function(value) {
		should(value.info)
		logger = value;
	}
	PnPPath.getLogger = function() {
		return logger || new Logger();
	}
	PnPPath.cardinalDirection = function(pt, homeLocus) {
		var dx = pt.x - homeLocus.x;
		var dy = pt.y - homeLocus.y;
		if (Math.abs(dx) > Math.abs(dy)) {
			return dx >= 0 ? 1 : 3; // east, west
		} else {
			return dy >= 0 ? 0 : 2; // north, south
		}
	}

	PnPPath.ftlDistance = function(pt1, pt2, homeLocus) {
		var dx = pt2.x - pt1.x;
		var dy = pt2.y - pt1.y;
		var numerator = Math.abs(
			dy*homeLocus.x 
			- dx*homeLocus.y 
			+ pt2.x*pt1.y 
			- pt2.y*pt1.x);
		var denominator = Math.sqrt(dy*dy + dx*dx);
		return numerator/denominator;
	}
	PnPPath.waypointsXY = function(pt1, pt2, homeLocus, hCruise) {
		var apogee = {
			x:(pt1.x+pt2.x)/2,
			y:(pt1.y+pt2.y)/2,
		};
		var waypointsXY = [];
		waypointsXY.push({x:pt1.x,y:pt1.y});
		var d = PnPPath.ftlDistance(pt1, pt2, homeLocus);
		var cd1 = PnPPath.cardinalDirection(pt1, homeLocus);
		var cd2 = PnPPath.cardinalDirection(pt2, homeLocus);
		if (d <= homeLocus.r || cd1 == cd2 || ((cd1+cd2) & 1) == 0) {
			waypointsXY.push(apogee);
		} else {
			if (cd1 === 0 || cd1 === 2) {
				waypointsXY.push({x:pt1.x, y:homeLocus.r});
			} else {
				waypointsXY.push({x:homeLocus.r, y:pt1.y});
			}
			if (cd2 === 0 || cd2 === 2) {
				waypointsXY.push({x:pt2.x, y:homeLocus.r});
			} else {
				waypointsXY.push({x:homeLocus.r, y:pt2.y});
			}
		}
		waypointsXY.push({x:pt2.x,y:pt2.y});

		logger.debug("waypointsXY:", waypointsXY);
		return waypointsXY;
	}


    Logger.logger.info("loaded firepick.PnPPath");
    module.exports = firepick.PnPPath = PnPPath;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.PnPPath", function() {
	var logger = new Logger({
		nPlaces:1,
		logLevel:"info"
	});
	var PnPPath = firepick.PnPPath;
	var epsilon = 0.000001;
	var pt1 = {x:10, y:20, z:-50};
	var pt2 = {x:-90, y:21, z:-60};
	var e = 0.000001;

	function shouldPositionT(actual, expected) {
		if (expected.x != null) {
			actual.x.should.within(expected.x-e, expected.x+e, "x actual:"+actual.x+" expected:"+expected.x);
		}
		if (expected.y != null) {
			actual.y.should.within(expected.y-e, expected.y+e, "y actual:"+actual.y+" expected:"+expected.y);
		}
		if (expected.z != null) {
			actual.z.should.within(expected.z-e, expected.z+e, "z actual:"+actual.z+" expected:"+expected.z);
		}
	}
	it("position(0) should return first point", function() {
		var pnp = new PnPPath(pt1, pt2, {});

		pnp.position(0).should.have.properties({
			x:pt1.x,
			y:pt1.y,
			z:pt1.z
		});
	});
	it("position(1) should return last point", function() {
		var pnp = new PnPPath(pt1, pt2, {});

		pnp.position(1).should.have.properties({
			x:pt2.x,
			y:pt2.y,
			z:pt2.z
		});
	});
	it('should have option for setting takeoff tau', function() {
		new PnPPath(pt1,pt2,{}).tauTakeoff.should.equal(0.1);
		new PnPPath(pt1,pt2,{tauTakeoff:0.2}).tauTakeoff.should.equal(0.2);
	});
	it('should have option for setting landing tau', function() {
		new PnPPath(pt1,pt2,{}).tauLanding.should.equal(0.9);
		new PnPPath(pt1,pt2,{tauLanding:0.8}).tauLanding.should.equal(0.8);
	});
	it('should have option for cruise height', function() {
		new PnPPath(pt1,pt2,{}).hCruise.should.equal(20);
		new PnPPath(pt1,pt2,{hCruise:50}).hCruise.should.equal(50);
	});
	it('should have option for unrestricted travel locus', function() {
		should.deepEqual(new PnPPath(pt1,pt2,{}).homeLocus, {x:0,y:0,r:70});
		should.deepEqual(new PnPPath(pt1,pt2,{homeLocus:{r:30}}).homeLocus, 
			{x:0,y:0,r:30});
	});
	it('should have property giving highest point of path', function() {
		new PnPPath(pt1,pt2,{}).should.have.properties({
			apogee:{z:-30}
		});
	});
	it('position(0.5) should be the apogee', function() {
		var pnp = new PnPPath(pt1,pt2,{});
		shouldPositionT(pnp.position(0.5), {z:-30});
	});
	it('position(0.1) should be directly above pt1', function() {
		var pnp = new PnPPath(pt1,pt2);
		var pos = pnp.position(0.1);
		shouldPositionT(pos, {x:pt1.x, y:pt1.y});
		pos.z.should.be.above(pt1.z);
	});
	it('position(0.9) should be directly above pt2', function() {
		var pnp = new PnPPath(pt1,pt2,{});
		var pos = pnp.position(0.9);
		shouldPositionT(pos, {x:pt2.x, y:pt2.y});
		pos.z.should.be.above(pt1.z);
	});
	it('cardinalDirection(pt,homeLocus) should give cardinal point as 0,1,2,3 for N,E,S,W', function() {
		PnPPath.cardinalDirection({x:50,y:90},{x:0,y:0}).should.equal(0);
		PnPPath.cardinalDirection({x:100,y:90},{x:0,y:0}).should.equal(1);
		PnPPath.cardinalDirection({x:100,y:90},{x:100,y:100}).should.equal(2);
		PnPPath.cardinalDirection({x:100,y:90},{x:200,y:100}).should.equal(3);
	});
	it('ftlDistance(pt1,pt2,homeLocus) should give distance to free travel locus', function() {
		var d = PnPPath.ftlDistance({x:0,y:10},{x:10,y:0},{x:0,y:0});
		should(d).within(7.071,7.072);
		d = PnPPath.ftlDistance({x:10,y:0},{x:0,y:10},{x:0,y:0});
		should(d).within(7.071,7.072);
		d = PnPPath.ftlDistance({x:10,y:0},{x:10,y:10},{x:0,y:0});
		should(d).equal(10); // horizontal line
		d = PnPPath.ftlDistance({x:10,y:0},{x:10,y:10},{x:0,y:0});
		should(d).equal(10); // vertical line
		d = PnPPath.ftlDistance({x:5,y:17},{x:15,y:7},{x:5,y:7});
		should(d).within(7.071,7.072);	// offset locus
	});
	it('collision avoidance path should be non-linear', function() {
		PnPPath.getLogger().setLevel("info");
		var pnp = new PnPPath({x:100,y:50,z:-30},{x:50,y:90,z:-40});
		var pos = pnp.position(0.5);
		var N = 20;
		for (var i=0; i<=N; i++) {
			var tau = i/N;
			logger.withPlaces(3).debug("position(", tau, "):", pnp.position(tau));
		}
		shouldPositionT(pos, {x:57.749458,y:58.638295,z:-10});
		pos.z.should.be.above(pt1.z);
	});
	it('opposing cardinal point paths should be linear', function() {
		PnPPath.getLogger().setLevel("info");
		var pnp = new PnPPath({x:100,y:80,z:-30},{x:-90,y:80,z:-40});
		var pos = pnp.position(0.5);
		var N = 20;
		for (var i=0; i<=N; i++) {
			var tau = i/N;
			logger.withPlaces(3).debug("position(", tau, "):", pnp.position(tau));
		}
		shouldPositionT(pos, {x:5,y:80,z:-10});
		pos.z.should.be.above(pt1.z);
	});
	it('identical cardinal point paths should be linear', function() {
		PnPPath.getLogger().setLevel("info");
		var pnp = new PnPPath({x:100,y:80,z:-30},{x:90,y:80,z:-40});
		var pos = pnp.position(0.5);
		var N = 20;
		for (var i=0; i<=N; i++) {
			var tau = i/N;
			logger.withPlaces(3).debug("position(", tau, "):", pnp.position(tau));
		}
		shouldPositionT(pos, {x:95,y:80,z:-10});
		pos.z.should.be.above(pt1.z);
	});
	it('waypointAngles() should give delta waypoint angles', function() {
		PnPPath.getLogger().setLevel("info");
		var pt1 = {x:100,y:50,z:-60};
		var pt2 = {x:50,y:90,z:-70};
		var segments = 5;
		var pnp = new PnPPath(pt1, pt2, {
			tauTakeoff:1/segments,
		});
		var dc = new DeltaCalculator();
		var waypoints = pnp.waypointAngles(dc,(segments+1)/segments);
		var N = waypoints.length-1;
		logger.debug("waypointAngles:", N);
		for (var i=0; i<=N; i++) {
			logger.withPlaces(3).debug("waypoint[", i, "]:",waypoints[i]);
		}
		N.should.equal(6);
	});
	it('waypointPulses() should give delta waypoint pulses', function() {
		PnPPath.getLogger().setLevel("info");
		var pt1 = {x:100,y:50,z:-60};
		var pt2 = {x:50,y:90,z:-70};
		var segments = 5;
		var pnp = new PnPPath(pt1, pt2, {
			tauTakeoff:1/segments,
		});
		var dc = new DeltaCalculator();
		var waypoints = pnp.waypointPulses(dc);
		var N = waypoints.length-1;
		logger.debug("waypointPulses:", N);
		for (var i=0; i<=N; i++) {
			logger.withPlaces(3).info("waypoint[", i, "]:",waypoints[i]);
		}
		N.should.equal(6);
	});
})
