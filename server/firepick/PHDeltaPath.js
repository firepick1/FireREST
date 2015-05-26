var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
PHFactory = require("./PHFactory");
PH5Curve = require("./PH5Curve");
PHFeed = require("./PHFeed");
DeltaCalculator = require("./DeltaCalculator");

(function(firepick) {
    function PHDeltaPath(xyz, options) {
		var that = this;

		xyz.length.should.above(1);
		options = options || {};
		that.vMax = options.vMax || 200;
		that.tvMax = options.tvMax || 0.1;
		that.vIn = options.vIn || 0;
		that.vCruise = options.vCruise || that.vMax;
		that.vOut = options.vOut || 0;
		that.N = options.N || 6;
		that.delta = options.delta || new DeltaCalculator(options);
		that.logger = options.logger || new Logger(options);

		var xy = [];
		var xz = [];
		var yz = [];
		for (var i=0; i<xyz.length; i++) {
			xy.push(new Complex(xyz[i].x, xyz[i].y));
			xz.push(new Complex(xyz[i].x, xyz[i].z));
			yz.push(new Complex(xyz[i].y, xyz[i].z));
		}
		var xyPH = new PHFactory(xy).quintic();
		//that.logger.withPlaces(6).info("xyPH.z", xyPH.z);
		var xzPH = new PHFactory(xz).quintic();
		//that.logger.withPlaces(6).info("xzPH.z", xzPH.z);
		var yzPH = new PHFactory(yz).quintic();
		//that.logger.withPlaces(6).info("yzPH.z", yzPH.z);
		var xyzFeedOptions = {
			vIn:that.vMax, 			// assume constant speed
		};
		that.xyPHF = new PHFeed(xyPH, xyzFeedOptions);
		that.xzPHF = new PHFeed(xzPH, xyzFeedOptions);
		that.yzPHF = new PHFeed(yzPH, xyzFeedOptions);
		var theta12 = [];
		var theta13 = [];
		var theta23 = [];
		var xyz = that.xyzA0Iterate();
		var angles = that.delta.calcAngles(xyz);
		that.logger.trace("angles:", angles);
		theta12.push(new Complex(angles.theta1, angles.theta2));
		theta13.push(new Complex(angles.theta1, angles.theta3));
		theta23.push(new Complex(angles.theta2, angles.theta3));
		for (var i=1; i<that.N; i++) {
			var tau = i/(that.N-1);
			xyz = that.xyzA0Iterate(tau,xyz);
			angles = that.delta.calcAngles(xyz);
			that.logger.trace("angles:", angles);
			theta12.push(new Complex(angles.theta1, angles.theta2));
			theta13.push(new Complex(angles.theta1, angles.theta3));
			theta23.push(new Complex(angles.theta2, angles.theta3));
		}
		var angleFeedOptions = {
			vIn:that.vIn, 
			vCruise:that.vCruise, 
			vOut:that.vOut, 
			vMax:that.vMax, 
			tvMax:that.tvMax
		};
		var theta12PH = new PHFactory(theta12).quintic();
		that.theta12PHF = new PHFeed(theta12PH, angleFeedOptions);
		//that.logger.withPlaces(6).info("theta12PHF profile:", that.theta12PHF.profile());
		var theta13PH = new PHFactory(theta13).quintic();
		that.theta13PHF = new PHFeed(theta13PH, angleFeedOptions);
		//that.logger.withPlaces(6).info("theta13PHF profile:", that.theta13PHF.profile());
		var theta23PH = new PHFactory(theta23).quintic();
		that.theta23PHF = new PHFeed(theta23PH, angleFeedOptions);
		//that.logger.withPlaces(6).info("theta23PHF profile:", that.theta23PHF.profile());

		return that;
    };

	///////////////// INSTANCE API ///////////////
	PHDeltaPath.prototype.xyzA0Iterate = function(p, prev) {
		var that = this;
		var epsilon = 0.000000001;
		p = p || 0;
		p.should.within(0,1);
		if (prev == null) {
			p.should.equal(0);
			var cxy = that.xyPHF.ph.r(0);
			var cxz = that.xzPHF.ph.r(0);
			var cyz = that.yzPHF.ph.r(0);
			cxy.re.should.within(cxz.re-epsilon,cxz.re+epsilon);
			cxy.im.should.within(cyz.re-epsilon,cyz.re+epsilon);
			return {p:0, x:cxy.re, y:cxy.im, z:cxz.im, Exy:0, Exz:0, Eyz:0};
		}
		prev.Exy.should.within(0,1);
		prev.Exz.should.within(0,1);
		prev.Eyz.should.within(0,1);
		var Exy = that.xyPHF.Ekt(prev.Exy, p);
		var Exz = that.xzPHF.Ekt(prev.Exz, p);
		var Eyz = that.xzPHF.Ekt(prev.Eyz, p);
		var cxy = that.xyPHF.ph.r(Exy);
		var cxz = that.xzPHF.ph.r(Exz);
		var cyz = that.yzPHF.ph.r(Exz);
		cxy.re.should.within(cxz.re-epsilon,cxz.re+epsilon);
		cxy.im.should.within(cyz.re-epsilon,cyz.re+epsilon);
		return {p:p, x:cxy.re, y:cxy.im, z:cxz.im, Exy:Exy, Exz:Exz, Eyz:Eyz};
	};
	PHDeltaPath.prototype.thetaIterate = function(tau, prev) {
		var that = this;
		var epsilon = 0.000000001;
		tau = tau || 0;
		tau.should.within(0,1);
		if (prev == null) {
			tau.should.equal(0);
			var c12 = that.theta12PHF.ph.r(0);
			var c13 = that.theta13PHF.ph.r(0);
			//var c23 = that.theta23PHF.ph.r(0);
			//c12.re.should.within(c13.re-epsilon,c13.re+epsilon);
			return {tau:0, theta1:c12.re, theta2:c12.im, theta3:c13.im, E12:0, E13:0, E23:0};
		}
		prev.E12.should.within(0,1);
		prev.E13.should.within(0,1);
		prev.E23.should.within(0,1);
		var E12 = that.theta12PHF.Ekt(prev.E12, tau);
		var E13 = E12; //that.theta13PHF.Ekt(prev.E13, tau);
		var E23 = 0; //that.theta13PHF.Ekt(prev.E23, tau);
		var c12 = that.theta12PHF.ph.r(E12);
		var c13 = that.theta13PHF.ph.r(E13);
		//var c23 = that.theta23PHF.ph.r(E23);
		//var thetaEpsilon = 0.005;
		//c12.re.should.within(c13.re-thetaEpsilon,c13.re+thetaEpsilon);
		//c12.im.should.within(c23.re-thetaEpsilon,c23.re+thetaEpsilon);
		return {tau:tau, theta1:c12.re, theta2:c12.im, theta3:c13.im, E12:E12, E13:E13, E23:E23};
	};

    Logger.logger.info("loaded firepick.PHDeltaPath");
    module.exports = firepick.PHDeltaPath = PHDeltaPath;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.PHDeltaPath", function() {
	var logger = new Logger({
		nPlaces:1,
		logLevel:"debug"
	});
	var epsilon = 0.000001;
	var PHDeltaPath = firepick.PHDeltaPath;
	function shouldPropertiesEqualT(actual, expected, epsilon) { 
		epsilon = epsilon || 0.001; 
		for (var k in expected) {
			var msg = k + " expected:" + expected[k] + " actual:" + actual[k];
			actual[k].should.within(expected[k]-epsilon,expected[k]+epsilon, msg);
		}
	};
	it("should have default options", function() {
		var xyz = [{x:0,y:0,z:-50},{x:90,y:0,z:-50}];
		var phd = new PHDeltaPath(xyz);
		var phdOptions = new PHDeltaPath(xyz,{
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
	it("xyzA0Iterate(p,prev) should use constant V for synchronizing different PH curves", function() {
		var phd = new PHDeltaPath([ {x:0,y:0,z:-50},
			{x:90,y:0,z:-50},
		], {
			logger:logger,
		});
		// constant velocity provides synchronization data between separate PH curves
		var xyz = phd.xyzA0Iterate();
		shouldPropertiesEqualT(xyz, {p:0, x:0, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.1, xyz);
		shouldPropertiesEqualT(xyz, {p:0.1, x:8.6, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.2, xyz);
		shouldPropertiesEqualT(xyz, {p:0.2, x:17.700, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.3, xyz);
		shouldPropertiesEqualT(xyz, {p:0.3, x:26.8, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.4, xyz);
		shouldPropertiesEqualT(xyz, {p:0.4, x:35.9, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.5, xyz);
		shouldPropertiesEqualT(xyz, {p:0.5, x:45, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.6, xyz);
		shouldPropertiesEqualT(xyz, {p:0.6, x:54.1, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.7, xyz);
		shouldPropertiesEqualT(xyz, {p:0.7, x:63.2, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.8, xyz);
		shouldPropertiesEqualT(xyz, {p:0.8, x:72.3, y:0, z:-50});
		xyz = phd.xyzA0Iterate(0.9, xyz);
		shouldPropertiesEqualT(xyz, {p:0.9, x:81.4, y:0, z:-50});
		xyz = phd.xyzA0Iterate(1, xyz);
		shouldPropertiesEqualT(xyz, {p:1, x:90, y:0, z:-50});
	});
	it("thetaIterate(tau,prev) should traverse path angles", function() {
		var phd = new PHDeltaPath([ {x:0,y:0,z:-50},
			{x:90,y:0,z:-50},
		], {
			vIn: 0,
			vCruise: 200,
			vOut: 0,
			N:9,
			logger:logger,
		});
		var angles = phd.thetaIterate();
		shouldPropertiesEqualT(angles, {tau:0, theta1:19.403, theta2:19.403, theta3:19.403});
		var xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:0, y:0, z:-50});
		angles = phd.thetaIterate(0.1, angles);
		shouldPropertiesEqualT(angles, {tau:0.1, theta1:19.403, theta2:19.041, theta3:19.766});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:0.685, y:-0.001, z:-49.999});
		angles = phd.thetaIterate(0.2, angles);
		shouldPropertiesEqualT(angles, {tau:0.2, theta1:19.465, theta2:15.944, theta3:22.859});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x: 6.543, y:-0.002, z:-49.998});
		angles = phd.thetaIterate(0.3, angles);
		shouldPropertiesEqualT(angles, {tau:0.3, theta1:19.883, theta2:9.944, theta3:28.853});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:17.929, y: 0.001, z:-50.001});
		angles = phd.thetaIterate(0.4, angles);
		shouldPropertiesEqualT(angles, {tau:0.4, theta1:20.768, theta2:3.514, theta3:35.300});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:30.280, y:-0.000, z:-50.000});
		angles = phd.thetaIterate(0.5, angles);
		shouldPropertiesEqualT(angles, {tau:0.5, theta1:22.122, theta2:-2.834, theta3:41.764});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:42.798, y:-0.000, z:-50.000});
		angles = phd.thetaIterate(0.6, angles);
		shouldPropertiesEqualT(angles, {tau:0.6, theta1:23.982, theta2:-9.052, theta3:48.316});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:55.639, y: 0.000, z:-50.000});
		angles = phd.thetaIterate(0.7, angles);
		shouldPropertiesEqualT(angles, {tau:0.7, theta1:26.419, theta2:-15.066, theta3:55.063});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:69.011, y: 0.000, z:-50.000});
		angles = phd.thetaIterate(0.8, angles);
		shouldPropertiesEqualT(angles, {tau:0.8, theta1:29.293, theta2:-20.347, theta3:61.609});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:82.098, y:-0.001, z:-50.000});
		angles = phd.thetaIterate(0.9, angles);
		shouldPropertiesEqualT(angles, {tau:0.9, theta1:31.044, theta2:-22.902, theta3:65.127});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:89.159, y:-0.000, z:-50.000});
		angles = phd.thetaIterate(1, angles);
		shouldPropertiesEqualT(angles, {tau:1, theta1:31.263, theta2:-23.191, theta3:65.546});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:90, y:0, z:-50});
	});
	it("thetaIterate(tau,prev) should traverse path angles", function() {
		var phd = new PHDeltaPath([ {x:0,y:0,z:-50},
			{x:90,y:0,z:-50},
		], {
			vIn: 0,
			vCruise: 200,
			vOut: 0,
			N:7,
			logger:logger,
		});
		var angles = phd.thetaIterate();
		shouldPropertiesEqualT(angles, {tau:0, theta1:19.403, theta2:19.403, theta3:19.403});
		var xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:0, y:0, z:-50});
		angles = phd.thetaIterate(0.1, angles);
		shouldPropertiesEqualT(angles, {tau:0.1, theta1:19.403, theta2:19.041, theta3:19.766});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:0.685, y:-0.001, z:-49.999});
		angles = phd.thetaIterate(0.2, angles);
		shouldPropertiesEqualT(angles, {tau:0.2, theta1:19.465, theta2:15.944, theta3:22.859});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x: 6.542, y:-0.002, z:-49.996});
		angles = phd.thetaIterate(0.3, angles);
		shouldPropertiesEqualT(angles, {tau:0.3, theta1:19.883, theta2:9.944, theta3:28.853});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:17.929, y: 0.001, z:-50.001});
		angles = phd.thetaIterate(0.4, angles);
		shouldPropertiesEqualT(angles, {tau:0.4, theta1:20.768, theta2:3.514, theta3:35.300});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:30.280, y:-0.000, z:-50.000});
		angles = phd.thetaIterate(0.5, angles);
		shouldPropertiesEqualT(angles, {tau:0.5, theta1:22.122, theta2:-2.834, theta3:41.764});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:42.798, y:-0.000, z:-50.000});
		angles = phd.thetaIterate(0.6, angles);
		shouldPropertiesEqualT(angles, {tau:0.6, theta1:23.982, theta2:-9.052, theta3:48.316});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:55.639, y: 0.000, z:-50.000});
		angles = phd.thetaIterate(0.7, angles);
		shouldPropertiesEqualT(angles, {tau:0.7, theta1:26.419, theta2:-15.066, theta3:55.063});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:69.010, y: 0.000, z:-50.000});
		angles = phd.thetaIterate(0.8, angles);
		shouldPropertiesEqualT(angles, {tau:0.8, theta1:29.295, theta2:-20.347, theta3:61.613});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:82.103, y:-0.001, z:-50.004});
		angles = phd.thetaIterate(0.9, angles);
		shouldPropertiesEqualT(angles, {tau:0.9, theta1:31.045, theta2:-22.902, theta3:65.128});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:89.161, y:-0.000, z:-50.001});
		angles = phd.thetaIterate(1, angles);
		shouldPropertiesEqualT(angles, {tau:1, theta1:31.263, theta2:-23.191, theta3:65.546});
		xyz = phd.delta.calcXYZ(angles);
		shouldPropertiesEqualT(xyz, {x:90, y:0, z:-50});
	});
})
