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
Maximizer = require("./Maximizer");

(function(firepick) {
	var logger = new Logger();
	var nullWriter = function(msg) {};
	var byteHex = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
	var deg60 = Math.PI / 3;

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
		that.pinProbe = options.pinProbe == null ? 2 : options.pinProbe;
		that.invertProbe = options.invertProbe == null ? false : options.invertProbeo
		that.vMax = options.vMax || 2*revPulses;
		that.vMax.should.above(0);
		that.tvMax = options.tvMax || 0.4;
		that.tvMax.should.above(0);
		that.bounds = {
			xMax: 90,
			xMin: -90,
			yMax: 90,
			yMin: -90,
			zMax: 40,
			zMin: -90,
		};

		return that;
    };

	///////////////// INSTANCE API ///////////////
	FireStep.prototype.health = function() {
		return 1;
	}
	FireStep.prototype.writeln = function(value) {
		var that = this;
		if (value != null) {
			that.write(value);
		}
		that.write("\n");
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
		that.writeln(JSON.stringify(cmd));
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
				"1":pulses.p1,
				"2":pulses.p2,
				"3":pulses.p3,
			}
		};
		that.writeln(JSON.stringify(cmd));
		that.position = dst;
		return that;
	}
	FireStep.prototype.origin = function() {
		var that = this;
		var hp = that.delta.homePulses;
		that.position = {x:0, y:0, z:0};
		var dstPulses = that.delta.calcPulses(that.position);
		var cmd = [
			{hom:{"1":hp.p1, "2":hp.p2, "3":hp.p3}},
			{mov:{"1":dstPulses.p1, "2":dstPulses.p2, "3":dstPulses.p3}}
		];
		that.writeln(JSON.stringify(cmd));
		return that;
	}
	FireStep.prototype.probe = function(dxyz) {
		var that = this;
		var xyz = {
			x: that.position.x + (dxyz.x==null ? 0 : dxyz.x),
			y: that.position.y + (dxyz.y==null ? 0 : dxyz.y),
			z: that.position.z + (dxyz.z==null ? 0 : dxyz.z),
		}
		var pulses = that.delta.calcPulses(xyz);
		var cmd = {prb:{
			1:pulses.p1,
			2:pulses.p2,
			3:pulses.p3,
			pn:that.pinProbe,
			ip:that.invertProbe
		}};
		that.writeln(JSON.stringify(cmd));
	}
	FireStep.prototype.getPulses = function() {
		var that = this;
		return that.delta.calcPulses(that.position);
	}
	FireStep.prototype.calibrateZProbe = function(pulseProbes) {
		var that = this;
		var fitnessTheta = {evaluate:function(eTheta) {
			var dc = that.delta;
			dc.eTheta1 = eTheta;
			dc.eTheta2 = eTheta;
			dc.eTheta3 = eTheta;
			var xyzProbes = [];
			var zSum = 0;
			var xyzCenter;
			var n = pulseProbes.length;
			for (var i=0; i<n; i++) {
				var xyz = dc.calcXYZ(pulseProbes[i]);
				xyzProbes.push(xyz);
				zSum += xyz.z;
			}
			var xyzCenter = xyzProbes[0];
			var zAvg = (zSum - xyzCenter.z) / (n-1);
			var result = Math.abs(zAvg - xyzCenter.z);
			logger.info("eTheta:", eTheta, " result:", result, " zAvg:", zAvg);
			return -result;
		}};
		var fitnessGearRatio = {evaluate:function(gearRatio) {
			var dc = that.delta;
			dc.gearRatio = gearRatio;
			var xyzProbes = [];
			var zSum = 0;
			var xyzCenter;
			var n = pulseProbes.length;
			for (var i=0; i<n; i++) {
				var xyz = dc.calcXYZ(pulseProbes[i]);
				xyzProbes.push(xyz);
				zSum += xyz.z;
			}
			var xyzCenter = xyzProbes[0];
			var zAvg = (zSum - xyzCenter.z) / (n-1);
			var dz = zAvg - xyzCenter.z;
			var result = -dz*dz;
			logger.info(" gearRatio:", gearRatio, " dz:", dz, " zAvg:", zAvg, " result:", result);
			return result;
		}};
		var fitness_re = {evaluate:function(re) {
			var dc = that.delta;
			dc.re = re;
			var xyzProbes = [];
			var zSum = 0;
			var xyzCenter;
			var n = pulseProbes.length;
			for (var i=0; i<n; i++) {
				var xyz = dc.calcXYZ(pulseProbes[i]);
				xyzProbes.push(xyz);
				zSum += xyz.z;
			}
			var xyzCenter = xyzProbes[0];
			var zAvg = (zSum - xyzCenter.z) / (n-1);
			var dz = zAvg - xyzCenter.z;
			var result = -dz*dz;
			logger.info(" re:", re, " dz:", dz, " zAvg:", zAvg, " result:", result, " xyz:", xyzCenter);
			return result;
		}};
		var fitness_f = {evaluate:function(f) {
			var dc = that.delta;
			dc.f = f;
			var xyzProbes = [];
			var zSum = 0;
			var xyzCenter;
			var n = pulseProbes.length;
			for (var i=0; i<n; i++) {
				var xyz = dc.calcXYZ(pulseProbes[i]);
				xyzProbes.push(xyz);
				zSum += xyz.z;
			}
			var xyzCenter = xyzProbes[0];
			var zAvg = (zSum - xyzCenter.z) / (n-1);
			var dz = zAvg - xyzCenter.z;
			var result = -dz*dz;
			logger.info(" f:", f, " dz:", dz, " zAvg:", zAvg, " result:", result, " xyz:", xyzCenter);
			return result;
		}};
		var fitnessPulses = {evaluate:function(dp) {
			var dc = that.delta;
			var xyzProbes = [];
			var zSum = 0;
			var xyzCenter;
			var n = pulseProbes.length;
			for (var i=0; i<n; i++) {
				var pulses = {
					p1:pulseProbes[i].p1+dp,
					p2:pulseProbes[i].p2+dp,
					p3:pulseProbes[i].p3+dp,
				};
				var xyz = dc.calcXYZ(pulses);
				if (xyz == null) {
					return -1000000;
				}
				xyzProbes.push(xyz);
				zSum += xyz.z;
			}
			var xyzCenter = xyzProbes[0];
			var zAvg = (zSum - xyzCenter.z) / (n-1);
			var result = -Math.abs(zAvg - xyzCenter.z);
			logger.withPlaces(4).info("dp:", dp, " result:", result, " zCtr:", xyzCenter.z, " zAvg:", zAvg);
			return result;
		}};
		var thetaErr = 10;
		var thetaMin = -thetaErr;
		var thetaMax = +thetaErr;
		var gearRatio = 150/16;
		var dRatio = 1;
		var re = that.delta.re;
		var dre = 40;
		var f = that.delta.f;
		var df = 40;
		var dpulses = 10000;
		//var solver = new Maximizer(fitnessPulses, {
		var solver = new Maximizer(fitnessGearRatio, {
			//nPlaces: 3,
			logLevel:logger.logLevel,
			//dxPolyFit:true,
		});
		//var rawResult = solver.solve(-5000,5000);
		//var rawResult = solver.solve(thetaMin, thetaMax);
		//var rawResult = solver.solve(f-df,f+df);
		//var rawResult = solver.solve(re-dre, re+dre);
		var rawResult = solver.solve(gearRatio-dRatio, gearRatio+dRatio);
		logger.info("level:", that.delta.calcPulses({x:0,y:0,z:0}));
		logger.info("rawResult:", rawResult);
		return rawResult;	
	}
	FireStep.prototype.hexaProbe = function(z,options) {
		var that = this;
		options = options || {};
		z.should.be.Number;
		var dz = options.dz == null ? 20 : options.dz;
		var r = options.r == null ? 50 : options.r;
		that.home();
		that.move({z:z});
		var xyzmin00 = that.probe({z:-dz});
		for (var i=0; i<6; i++) {
			var a = i * deg60;
			var x = r * Math.sin(a);
			var y = r * Math.cos(a);
			var xyzUp = {x:x,y:y,z:z};
			that.move(xyzUp);
			that.probe({z:-dz});
		}
	}
	FireStep.prototype.pnpSample = function(xyz1, xyz2, N) {
		var that = this;
		var nTakeoff = 5;
		var pnp = new PnPPath(xyz1, xyz2, {
			hCruise: that.hCruise,
			tauTakeoff: 1/nTakeoff,
		});
		var waypoints = pnp.waypointPulses(that.delta);
		var pulses = [];
		var dIm = Math.abs(that.delta.homePulses.p1/nTakeoff); 
		var pts1 = [];
		var pts2 = [];
		var pts3 = [];
		for (var i=0; i<waypoints.length; i++) {
			logger.info("pnpPulses() waypoints[",i,"]:", waypoints[i]);
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
		var E = phf.Ekt(0,0);
		pulses.push(that.delta.calcPulses(xyz1));
		for (var i=1; i<=N; i++) {
			var tau = i/N;
			E = phf.Ekt(E, tau);
			pulses.push({
				p1:Math.round(ph1.r(E).re), 
				p2:Math.round(ph2.r(E).re), 
				p3:Math.round(ph3.r(E).re),
			});
		}
		return {
			tS:phf.tS,
			pulses:pulses,
		};
	}
	FireStep.prototype.jumpTo = function(xyz) {
		var that = this;
		var dst = {
			x: xyz.x == null ? that.position.x : xyz.x,
			y: xyz.y == null ? that.position.y : xyz.y,
			z: xyz.z == null ? that.position.z : xyz.z,
		};
		var N = 64; // number of dvs segments
		var sample = that.pnpSample(that.position, dst, N);
		var pulses = sample.pulses;
		var nTakeoff = 5;
		var pnp = new PnPPath(that.position, dst, {
			hCruise: that.hCruise,
			tauTakeoff: 1/nTakeoff,
		});
		var scale = 2;
		var startPulses = {
			p1: Math.round(pulses[0].p1/scale),
			p2: Math.round(pulses[0].p2/scale),
			p3: Math.round(pulses[0].p3/scale),
		}
		var rPrev = startPulses;
		var v = {p1:0, p2:0, p3:0};
		var p = {p1:"", p2:"", p3:""};
		var r;
		for (var i=1; i<=N; i++) {
			r = {
				p1: Math.round(pulses[i].p1/scale),
				p2: Math.round(pulses[i].p2/scale),
				p3: Math.round(pulses[i].p3/scale),
			};
			var dr = {
				p1: r.p1 - rPrev.p1,
				p2: r.p2 - rPrev.p2,
				p3: r.p3 - rPrev.p3,
			};
			var dv = {
				p1: dr.p1 - v.p1,
				p2: dr.p2 - v.p2,
				p3: dr.p3 - v.p3,
			};
			logger.info("jumpTo() pulses[", i, "]:", pulses[i], " dr:", dr, " dv:", dv);
			p.p1 += FireStep.byteToHex(dv.p1);
			p.p2 += FireStep.byteToHex(dv.p2);
			p.p3 += FireStep.byteToHex(dv.p3);
			v.p1 += dv.p1;
			v.p2 += dv.p2;
			v.p3 += dv.p3;
			rPrev = r;
		}
		logger.debug("p:", p);
		var endPulses = that.delta.calcPulses(xyz);
		logger.debug("endPulses:", endPulses);
		var dvs = {'dvs':{
			'sc':scale,
			'us':Math.round(sample.tS * 1000000),
			'dp':{
				'1':Math.round(pulses[N].p1-pulses[0].p1),
				'2':Math.round(pulses[N].p2-pulses[0].p2),
				'3':Math.round(pulses[N].p3-pulses[0].p3),
				},
			'1':p.p1,
			'2':p.p2,
			'3':p.p3,
		}};
		var dvsJson = JSON.stringify(dvs);
		logger.info("dvs:", dvsJson.length, "B ", dvsJson);
		that.writeln(dvsJson);
		that.position = xyz;
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
	FireStep.byteToHex = function(byte) {
		return byteHex[(byte>>4)&0xf] + byteHex[byte&0xf];
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
		for (var k in b) {
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
		var fs = new FireStep({
			steps360: 200,
			write:testWrite,
		});
		testCmd(function(){ fs.home(); },'{"hom":{"x":-5600,"y":-5600,"z":-5600}}\n');
		shouldEqualT(fs.position, fs.delta.calcXYZ(fs.delta.homeAngles));
	});
	it("getPulses() should return pulse position", function() {
		var fs = new FireStep();
		shouldEqualT(fs.move({x:1,y:2,z:3}).getPulses(), {p1:-227,p2:-406,p3:-326});
	});
	it("should implement getXYZ()", function() {
		shouldEqualT(new FireStep().getXYZ(), {x:0,y:0,z:0});
		shouldEqualT(new FireStep({position:{x:1,y:2,z:3}}).getXYZ(), {x:1,y:2,z:3});
	});
	it("should implement move()", function() {
		var fs = new FireStep({write:testWrite});
		testCmd(function(){ fs.move({x:1,y:2,z:3}); },
			'{"mov":{"1":-227,"2":-406,"3":-326}}\n'
		);
		shouldEqualT(fs.getXYZ(),{x:1,y:2,z:3});
		testCmd(function(){ fs.move({x:0,y:0,z:0}); },
			'{"mov":{"1":0,"2":0,"3":0}}\n'
		);
		shouldEqualT(new FireStep().getXYZ(), {x:0,y:0,z:0});
	});
	it("should implement origin()", function() {
		var fs = new FireStep({write:testWrite});
		testCmd(function(){ fs.origin(); },
			'[{"hom":{"1":-11200,"2":-11200,"3":-11200}},' +
			'{"mov":{"1":0,"2":0,"3":0}}]\n'
		);
		shouldEqualT(fs.getXYZ(), {x:0,y:0,z:0});
	});
	it("should implement XYZPositioner", function() {
		XYZPositioner.validate(new FireStep());
	});
	it("byteToHex() should return hex string of byte", function() {
		FireStep.byteToHex(0x00).should.equal("00");
		FireStep.byteToHex(0x10).should.equal("10");
		FireStep.byteToHex(0x02).should.equal("02");
		FireStep.byteToHex(0x30).should.equal("30");
		FireStep.byteToHex(0x04).should.equal("04");
		FireStep.byteToHex(0x50).should.equal("50");
		FireStep.byteToHex(0x06).should.equal("06");
		FireStep.byteToHex(0x70).should.equal("70");
		FireStep.byteToHex(0x08).should.equal("08");
		FireStep.byteToHex(0x90).should.equal("90");
		FireStep.byteToHex(0x0A).should.equal("0A");
		FireStep.byteToHex(0xB0).should.equal("B0");
		FireStep.byteToHex(0x0C).should.equal("0C");
		FireStep.byteToHex(0xD0).should.equal("D0");
		FireStep.byteToHex(0x0E).should.equal("0E");
		FireStep.byteToHex(0xFF).should.equal("FF");
	});
	it("pnpSample() should sample a PnP path between two points", function() {
		var fs = new FireStep({write:testWrite});
		var xyz1 = {x:90,y:30,z:-70}; // starting point (pick)
		var xyz2 = {x:30,y:90,z:-80}; // ending point (place)
		var N = 64; // number of samples - 1
		var sample = fs.pnpSample(xyz1, xyz2, N);
		shouldEqualT(sample, {tS:1.697});
		var pulses = sample.pulses;
		for (var i=0; i<=N; i++) {
			var xyzi = fs.delta.calcXYZ(pulses[i]);
			logger.withPlaces(3).info("tau[", i, "]:", i/N, " ", pulses[i], " ", xyzi);
		}
		shouldEqualT(pulses[0], {p1:10337, p2:5443, p3:11339});
		shouldEqualT(pulses[N/2], {p1:7718, p2:3454, p3:6685});
		shouldEqualT(pulses[N], {p1:13427, p2:7775, p3:10020});
	});
	it("jumpTo() should traverse pick and place path", function() {
		var fs = new FireStep({write:testWrite});
		fs.move({x:100,y:0,z:-70});
		shouldEqualT(fs.getPulses(), {p1:9563, p2:5959, p3:12228});
		testCmd(function(){ fs.jumpTo({x:-100,y:0,z:-80}); },
			'{"dvs":{'+
			'"1":"00FFFEFBFAF7F5F2F1EFEFEEF0F1F1F5FA01060F1619171514120E0F0B0D0A0A'+
				 '090808070606040504030503030403040304040300FCF6F2EDEBEBEDF1F5FAFE",'+
			'"2":"00FEFDF8F5F3F1F2F3F7F900010406070A0E0F15161615110E0C0A0708060606'+
				 '05040403040102020002FF010000FF00FFFF00FFFAF8F2EFEBEBECEDF3F5FBFE",'+
			'"3":"0000FEFFFCFBF8F4F1EDE9E6E6E4E4E8ECF3FA060D14151516131211100E0F0C'+
				 '0B0B0A08080706060605060506050707060806080501FDF8F3F0F0EFF3F7FBFE",'+
			'"sc":2,"us":1873817,"dp":{"1":1556,"2":7742,"3":-4881}}}'
		+'\n');
		shouldEqualT(fs.getPulses(), {p1:11119, p2:13701, p3:7347});
	});
	it("jumpTo() should avoid obstacles", function() {
		var fs = new FireStep({write:testWrite});
		fs.move({x:90,y:30,z:-70});
		shouldEqualT(fs.getPulses(), {p1:10337, p2:5443, p3:11339});
		testCmd(function(){ fs.jumpTo({x:30,y:90,z:-80}); },
			'{"dvs":{'+
				'"1":"00FFFDFCF8F7F5F4F5F5F8FAFCFE01020102020204040306090B121418181810'+
					'0D090703030001FF0000FF01FF0100000100FEFEFAF6F5F2F2F1F2F5F6FBFCFF",'+
				'"2":"00FFFCFBF8F5F3F4F5F7FAFD00050407050704060405040407070A0C0C0D0B08'+
					'0703050103000102010102030303030404030400FEFAF6F5F2F1F2F4F6F9FEFE",'+
				'"3":"00FFFDFBF7F7F4F4F5F7FAFCFF020404040100FCFBF8F3F3F3F8FD01080D0E11'+
					'0E0F0F0E0F10100F0D0D0B0A0708050405030300FDF9F5F2F0F0EFF3F5F8FCFF",'+
				'"sc":2,"us":1697160,"dp":{"1":3090,"2":2332,"3":-1319}}}'
		+'\n');
		shouldEqualT(fs.getPulses(), {p1:13427, p2:7775, p3:10020});
		shouldEqualT(fs.getXYZ(), {x:30,y:90,z:-80});
	});
	it("TESTTESTprobe() should detect obstacle", function() {
		var fs = new FireStep({
			steps360: 200,
			write:testWrite,
		});
		fs.move({z:-90});
		var result;
		testCmd(function(){ 
			result = fs.probe({z:-20}); 
		}, '{"prb":{"1":6921,"2":6921,"3":6921,"pn":2,"ip":false}}\n');
	});
	it("TESTTESTshould probe a hexagon", function() {
		var fs = new FireStep({
			steps360: 200,
			write:testWrite,
		});
		testCmd(function(){ 
			fs.hexaProbe(-40);
		},
		'{"hom":{"x":-5600,"y":-5600,"z":-5600}}\n'+
		'{"mov":{"1":2009,"2":2009,"3":2009}}\n'+
		'{"prb":{"1":3019,"2":3019,"3":3019,"pn":2,"ip":false}}\n'+
		'{"mov":{"1":3184,"2":1761,"3":1761}}\n'+
		'{"prb":{"1":4144,"2":2807,"3":2807,"pn":2,"ip":false}}\n'+
		'{"mov":{"1":2734,"2":1252,"3":2734}}\n'+
		'{"prb":{"1":3728,"2":2315,"3":3728,"pn":2,"ip":false}}\n'+
		'{"mov":{"1":1761,"2":1761,"3":3184}}\n'+
		'{"prb":{"1":2807,"2":2807,"3":4144,"pn":2,"ip":false}}\n'+
		'{"mov":{"1":1252,"2":2734,"3":2734}}\n'+
		'{"prb":{"1":2315,"2":3728,"3":3728,"pn":2,"ip":false}}\n'+
		'{"mov":{"1":1761,"2":3184,"3":1761}}\n'+
		'{"prb":{"1":2807,"2":4144,"3":2807,"pn":2,"ip":false}}\n'+
		'{"mov":{"1":2734,"2":2734,"3":1252}}\n'+
		'{"prb":{"1":3728,"2":3728,"3":2315,"pn":2,"ip":false}}\n'+
		''
		);
	});
	it("TESTTESTshould hexaprobe", function() {
		var fs = new FireStep({
			steps360: 200,
			write:testWrite,
		});
		var pulsesPlanned = [
			{"p1":2009,"p2":2009,"p3":2009},
			{"p1":2729,"p2":1253,"p3":1253},
			{"p1":2259,"p2":732,"p3":2259},
			{"p1":1253,"p2":1253,"p3":2729},
			{"p1":732,"p2":2259,"p3":2259},
			{"p1":1253,"p2":2729,"p3":1253},
			{"p1":2259,"p2":2259,"p3":732},
		];
		var pulsesMeasured = [
			{"p1":2214,"p2":2214,"p3":2214},
			{"p1":3402,"p2":1999,"p3":1999},
			{"p1":2951,"p2":1484,"p3":2951},
			{"p1":1974,"p2":1974,"p3":3379},
			{"p1":1457,"p2":2926,"p3":2926},
			{"p1":1975,"p2":3380,"p3":1975},
			{"p1":2952,"p2":2952,"p3":1485},
		];
		for (var i=0; i<pulsesPlanned.length; i++){
			var xyzM = fs.delta.calcXYZ(pulsesMeasured[i]);
			var xyzP = fs.delta.calcXYZ(pulsesPlanned[i]);
			logger.withPlaces(2).info("measured:", i, " ", xyzM, "\tplanned:", xyzP);
		}
		fs.calibrateZProbe(pulsesMeasured);
	});
})
