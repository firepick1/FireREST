var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
Bernstein = require("./Bernstein");
Tridiagonal = require("./Tridiagonal");

(function(firepick) {
    function PHCurve(pts,options) {
		var that = this;
		options = options || {};
		that.logger = options.logger || new Logger(options);
		that.degree = 5;	// only support quintics
		that.degree2 = Math.ceil(that.degree/2);
		that.dzMax = options.dzMax || 0.00001;
		that.iterationsMax = options.iterationsMax || 50;
		pts.should.be.Array;
		pts.length.should.be.above(1);
		initz(that,pts);
		that.N = that.q.length-1;
		that.bn = new Bernstein(that.degree);
		that.bn1 = new Bernstein(that.degree+1);
		that.bn_1 = new Bernstein(that.degree-1);
		var u = [0,0,0];
		var v = [0,0,0];
		that.sigmak = [
			u[0]*u[0] + v[0]*v[0],
			u[0]*u[1] + v[0]*v[1],
			2/3*(u[1]*u[1] + v[1]*v[1]) + 1/3*(u[0]*u[2]+v[0]*v[2]),
			u[1]*u[2]+v[1]*v[2],
			u[2]*u[2]+v[2]*v[2],
		];
		return that;
    };

	function initz(that,pts) {
		var z = ["z0"];
		var q = [];
		if (pts.length === 2) { // interpolate
			pts = [
				pts[0],
				Complex.times(1/2,
					Complex.plus(pts[0],pts[1])),
				pts[1],
			];
		}
		for (var i=0; i < pts.length; i++) {
			q.push(Complex.from(pts[i]));
			if (i > 0) {
				z.push(q[i].minus(q[i-1]).sqrt());	// linear starting condition
			}
		}
		that.logger.trace("z:", z);
		that.logger.trace("q:", q);
		for (var i=2; i < q.length; i++) {
			var modq1 = q[i].minus(q[i-1]).modulus();
			var modq2 = q[i-1].minus(q[i-2]).modulus();
			var ratio = modq1 / modq2;
			if (ratio < 1/2 || 2 < ratio) {
				that.logger.warn("uneven point spacing ratio:", ratio, 
					" q[", i, "]:", q[i], " q:", q);
			}
		}
		that.z = z;
		that.q = q;
	};

	/////////////// PRIVATE ////////////////
	function powert(t,tk,t1k,K) {
		var t1 = 1 - t;
		tk.push(1);
		t1k.push(1);
		for (var k=1; k<=K; k++) {
			tk.push(t*tk[k-1]);
			t1k.splice(0, 0, t1*t1k[0]);
		}
	};

    ///////////////// INSTANCE ///////////////
	PHCurve.prototype.newtonRaphson = function(options) {
		var that = this;
		var loop = true;
		var iteration = 1;
		options = options || {};
		var iterationsMax = options.iterationMax || that.iterationsMax;
		var logLevel = that.logger.logLevel;
		that.logger.setLevel(options.logLevel || logLevel);
		for (; loop && iteration<=iterationsMax; iteration++) {
			var a = [];
			var b = [];
			var c = [];
			var d = [];
			var N = that.N;
			var c0 = new Complex();
			for (var i=1; i <= N; i++) {
				a.push(i === 1 ? c0 : that.Mij(i,i-1));
				b.push(that.Mij(i,i));
				c.push(i === N ? c0 : that.Mij(i,i+1));
				d.push(Complex.minus(that.fi(i)));
			}
			that.logger.trace("a:", a);
			that.logger.trace("b:", b);
			that.logger.trace("c:", c);
			that.logger.trace("d:", d);
			var tri = new Tridiagonal(that.N);
			var dz = tri.solveComplex(a,b,c,d);
			that.logger.trace("dz:", dz);
			loop = false;
			for (var i=0; i < dz.length; i++) {
				loop = loop || dz[i].modulus() > that.dzMax;
				that.z[i+1].add(dz[i]);
			}
		}
		var result = null;
		if (loop) {
			that.logger.warn("newtonRaphson exceeded iterationsMax:", that.iterationsMax);
		} else {
			that.logger.debug("newtonRaphson converged iterations:", iteration-1);
			result = iteration-1;
		}
		that.logger.debug("z:", that.z);
		that.dumpJacobian();
		that.logger.setLevel(logLevel);
		return result;
	};
	PHCurve.prototype.r = function(T) {
		var that = this;
		T.should.not.be.below(0);
		T.should.not.be.above(1);
		var TN = T * that.N;
		var i = Math.ceil(TN) || 1;
		return that.rit(i,TN-i+1);
	};
	PHCurve.prototype.rit = function(i,t) {
		var that = this;
		i.should.not.be.below(0);
		i.should.not.be.above(that.N);
		t.should.not.be.below(0);
		t.should.not.be.above(1);
		that.logger.trace("rit(", i, ",", t, ")");
		var sum = new Complex();
		var tk = [];
		var t1k = [];
		powert(t,tk,t1k,5);
		for (var k=0; k<=5; k++) {
			var re = Util.choose(5,k) * t1k[k] * tk[k];
			var c = Complex.times(that.pik(i,k), re);
			sum.add(c);
			that.logger.trace("rit k:", k, " re:", re, " c:", c, " sum:", sum, " pik:", that.pik(i,k), " choose:", Util.choose(5,k));
		}
		return sum;
	};
	PHCurve.prototype.w1j = function(j) {
		var that = this;
		var z1 = that.z[1];
		var z2 = that.z[2];
		switch (j) {
		case 0:return Complex.times(1/2, Complex.times(3,z1).minus(z2));
		case 1:return z1;
		case 2:return Complex.times(1/2,z1.plus(z2));
		default: should.fail("w1j j:"+j);
		}
	};
	PHCurve.prototype.wNj = function(j) {
		var that = this;
		var zN = that.z[that.N];
		var zN1 = that.z[that.N-1];
		switch(j) {
		case 0:return Complex.times(1/2,zN1.plus(zN));
		case 1:return zN;
		case 2:return Complex.times(1/2, Complex.times(3,zN).minus(zN1));
		default: should.fail("wNj j:"+j);
		}
	};
	PHCurve.prototype.wij = function(i,j) {
		var that = this;
		if (i === 1) {
			return that.w1j(j);
		}
		if (i === that.N) {
			return that.wNj(j);
		}
		var zi = that.z[i];
		i.should.not.be.below(1);
		i.should.not.be.above(that.N);
		zi.should.instanceOf(Complex);
		that.z[i-1].should.instanceOf(Complex);
		switch (j) {
		case 0:return Complex.times(1/2,that.z[i-1].plus(zi));
		case 1:return zi;
		case 2:return Complex.times(1/2,zi.plus(that.z[i+1]));
		default: should.fail("wij j:"+j);
		}
	};
	PHCurve.prototype.pik = function(i,k) {
		var that = this;
		i.should.be.above(0);
		i.should.not.be.above(that.N);
		if (i === 1) {
			//return that.p1k(k);
		}

		switch (k) {
		case 0: return that.q[i-1];
		case 1: return that.pik(i,0)
			.plus(Complex.times(1/5,that.wij(i,0).times(that.wij(i,0))));
		case 2: return that.pik(i,1)
			.plus(Complex.times(1/5,that.wij(i,0).times(that.wij(i,1))));
		case 3: return that.pik(i,2)
			.plus(Complex.times(2/15,that.wij(i,1).times(that.wij(i,1))))
			.plus(Complex.times(1/15,that.wij(i,0).times(that.wij(i,2))));
		case 4: return that.pik(i,3)
			.plus(Complex.times(1/5,that.wij(i,1).times(that.wij(i,2))));
		case 5: return that.pik(i,4)
			.plus(Complex.times(1/5,that.wij(i,2).times(that.wij(i,2))));
		default: should.fail("invalid k:" + k);
		}
	};
	PHCurve.prototype.Vk = function(vin,vout,k) {
		var that = this;
		return k < that.degree2 ? vin : vout;
	};
	PHCurve.prototype.V = function(vin, vout, t) {
		var that = this;
		var sum = 0;
		for (var k=0; k <= that.degree; k++) {
			that.logger.trace("that.degree:", that.degree, " k:", k, " t:", t,
				" V(k):", that.Vk(vin,vout,k), 
				" coefficient(k,t):", that.bn.coefficient(k,t));
			sum += that.Vk(vin,vout,k) * that.bn.coefficient(k,t);
		}
		return sum/(1+that.degree);
	};
	PHCurve.prototype.Fk = function(vin, vout, k) {
		var that = this;
		var sum = 0;
		for (var j=0; j < k; j++) {
			sum += that.Vk(vin,vout,j);
		}
		return sum/(1+that.degree);
	};
	PHCurve.prototype.F = function(vin, vout, t, T) {
		var that = this;
		var sum = 0;
		var n1 = that.degree+1;
		T = T || 1;
		for (var k=0; k <= n1; k++) {
			sum += that.Fk(vin,vout,k) * that.bn1.coefficient(k,t);
		}
		return T * sum;
	};
	PHCurve.prototype.xyi = function(i,t) {
		var that = this;
		var sum = 0;
		var t1 = 1-t;
		var tk = [1];
		var t1k = [1];
		for (var k=1; k<=that.degree; k++) {
			tk.push(t*tk[k-1]);
			t1k.splice(0, 0, t1*t1k[0]);
		}
		for (var k=0; k<=5; k++) {
			sum += that.p[i][k] * Util.choose(5,k) * t1k[k] * tk[k];
		}

		return sum;
	};
	PHCurve.prototype.sigmat = function(t) {
		var that = this;
		var sum = 0;
		for (var k=0; k < that.degree; k++) {
			sum += sigmak[k] * that.bn_1(t);
		}
		return sum;
	};
	PHCurve.prototype.fi = function(i) {
		var that = this;
		var N = that.N;
		i.should.be.above(0);
		i.should.not.be.above(N);
		var sum = new Complex();
		var q = that.q;
		var z = that.z;
		if (i === 1) {
			var z1 = z[1];
			var z2 = z[2];
			sum.add(Complex.times(13, z1, z1));
			sum.add(Complex.times(    z2, z2));
			sum.add(Complex.times(-2, z1, z2));
			sum.add(Complex.times(-12,q[1].minus(q[0])));
		} else if (i === N) {
			var N1 = N - 1;
			var zN = z[N];
			var zN1 = z[N1];
			sum.add(Complex.times(13, zN, zN));
			sum.add(Complex.times(    zN1,zN1));
			sum.add(Complex.times(-2, zN, zN1));
			sum.add(Complex.times(-12,q[N].minus(q[N1])));
		} else {
			sum.add(Complex.times(3,  z[i-1],z[i-1]));
			sum.add(Complex.times(27, z[i],  z[i]));
			sum.add(Complex.times(3,  z[i+1],z[i+1]));
			sum.add(Complex.times(	  z[i-1],z[i+1]));
			sum.add(Complex.times(13, z[i-1],z[i]));
			sum.add(Complex.times(13, z[i],  z[i+1]));
			sum.add(Complex.times(-60,q[i].minus(q[i-1])));
		}
		return sum;
	};
	PHCurve.prototype.Mij = function(i,j) {
		var that = this;
		var N = that.N;
		var N1 = N-1;
		i.should.be.above(0);
		j.should.be.above(0);
		i.should.not.be.above(N);
		j.should.not.be.above(N);
		var sum = new Complex();
		var z = that.z;
		if (j === i-1) {
			if (i === 1) {
				should.fail();
			} else if (i === N) {
				sum.add(Complex.times(2,z[N1]));
				sum.add(Complex.times(-2,z[N]));
			} else {
				sum.add(Complex.times(6,z[i-1]));
				sum.add(Complex.times(13,z[i]));
				sum.add(z[i+1]);
			}
		} else if (j === i) {
			if (i === 1) {
				sum.add(Complex.times(26,z[1]));
				sum.add(Complex.times(-2,z[2]));
			} else if (i === N) {
				sum.add(Complex.times(26,z[N]));
				sum.add(Complex.times(-2,z[N1]));
			} else {
				sum.add(Complex.times(13,z[i-1]));
				sum.add(Complex.times(54,z[i]));
				sum.add(Complex.times(13,z[i+1]));
			}
		} else if (j === i+1) {
			if (i === 1) {
				sum.add(Complex.times(2,z[2]));
				sum.add(Complex.times(-2,z[1]));
			} else if (i === N) {
				should.fail();
			} else {
				sum.add(z[i-1]);
				sum.add(Complex.times(13,z[i]));
				sum.add(Complex.times(6,z[i+1]));
			}
		} else {
			// zero
		}
		return sum;
	};
	PHCurve.prototype.dumpJacobian = function(nPlaces) {
		var that = this;
		var N = that.N;
		nPlaces = nPlaces || 0;
		for (var i=1; i <= N; i++) {
			var row = "|\t";
			for (var j=1; j <= N; j++) {
				var mij = that.Mij(i,j);
				row += mij.stringify(nPlaces);
				row += "\t";
			}
			row += "| = - | ";
			row += that.fi(i).stringify(nPlaces);
			row += "\t|";
			that.logger.debug(row);
		}
	};

	///////////////// CLASS //////////

    Logger.logger.info("loaded firepick.PHCurve");
    module.exports = firepick.PHCurve = PHCurve;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.PHCurve", function() {
	var logger = new Logger({
		nPlaces:1,
		logLevel:"debug"
	});
	var PHCurve = firepick.PHCurve;
	var pts = [
		{x:0,y:0},
		{x:1,y:0},
		{x:2,y:1},
		{x:3,y:1},
		{x:4,y:1}, 
	]; 
	function shouldEqualT(c1,c2,epsilon) { 
		epsilon = epsilon || 0.001; 
		c1.should.instanceof(Complex);
		c2.should.instanceof(Complex);
		c1.isNear(c2, epsilon).should.equal(true, 
			"expected:" + c2.stringify({nPlaces:3}) +
			" actual:" + c1.stringify({nPlaces:3}));
	};
	it("new PHCurve(5,[pts]) should create a 5-degree PHCurve instance", function() {
		var ph5 = new PHCurve(pts);
		ph5.should.have.properties({degree:5,degree2:3});
	});
	it("V(vin,vout,t) should interpolate velocity on interval t:[0,1]", function() {
		var ph5 = new PHCurve(pts,{logger:logger});
		ph5.V(-100,100,0).should.equal(-100);
		ph5.V(-100,100,0.1).should.within(-84,-83);
		ph5.V(-100,100,0.2).should.within(-65,-64);
		ph5.V(-100,100,0.3).should.within(-45,-44);
		ph5.V(-100,100,0.4).should.within(-23,-22);
		ph5.V(-100,100,0.5).should.within(0,0);
		ph5.V(-100,100,0.6).should.within(22,23);
		ph5.V(-100,100,0.7).should.within(44,45);
		ph5.V(-100,100,0.8).should.within(64,65);
		ph5.V(-100,100,0.9).should.within(83,84);
		ph5.V(-100,100,1).should.equal(100);
	});
	it("F(vin,vout,t) should interpolate V integral on interval t:[0,1]", function() {
		var ph5 = new PHCurve(pts,{logger:logger});
		ph5.F(-100,100,0).should.equal(-100);
		ph5.F(-100,100,0.1).should.within(-111,-110);
		ph5.F(-100,100,0.2).should.within(-122,-121);
		ph5.F(-100,100,0.3).should.within(-130,-129);
		ph5.F(-100,100,0.4).should.within(-136,-135);
		ph5.F(-100,100,0.5).should.within(-138,-137);
		ph5.F(-100,100,0.6).should.within(-136,-135);
		ph5.F(-100,100,0.7).should.within(-130,-129);
		ph5.F(-100,100,0.8).should.within(-122,-121);
		ph5.F(-100,100,0.9).should.within(-111,-110);
		ph5.F(-100,100,1).should.equal(-100);
	});
	it("new PHCurve([p1,p2]).r(t) should interpolate a 2-point straight line", function() {
		var ph = new PHCurve([
			{x:1,y:1},
			{x:5,y:3},
		],{logger:logger});
		var z1N = new Complex(2,1).sqrt();
		shouldEqualT(ph.z[1], z1N);
		shouldEqualT(ph.z[2], z1N);
		should.deepEqual(ph.r(0), new Complex(1,1));

		shouldEqualT(ph.r(0.1), new Complex(1.4, 1.2));
		shouldEqualT(ph.r(0.5), new Complex(3, 2));
		shouldEqualT(ph.r(0.6), new Complex(3.4, 2.2));
		shouldEqualT(ph.r(0.9), new Complex(4.6,2.8));
		shouldEqualT(ph.r(1), new Complex(5,3));
	});
	it("new PHCurve([p1,p2]).r(t) should interpolate a 4-point straight line", function() {
		var ph = new PHCurve([
			{x:1,y:1},
			{x:2,y:1.5},
			{x:4,y:2.5},
			{x:5,y:3},
		],{logger:logger});
		should.deepEqual(ph.r(0), new Complex(1,1));
		shouldEqualT(ph.r(0.1), new Complex(1.2197, 1.1098));
		shouldEqualT(ph.r(0.5), new Complex(2.815, 1.907));
		shouldEqualT(ph.r(0.6), new Complex(3.320, 2.160));
		shouldEqualT(ph.r(0.9), new Complex(4.795, 2.897));
		shouldEqualT(ph.r(1), new Complex(5.014,3.007));
	});
	it("new PHCurve([p1,p2]).r(t) should interpolate a 5-point straight line", function() {
		var ph = new PHCurve([
			{x:1,y:1},
			{x:2,y:1.5},
			{x:3,y:2},
			{x:4,y:2.5},
			{x:5,y:3},
		],{logger:logger});
		var z1N = new Complex(1,0.5).sqrt();
		shouldEqualT(ph.z[1], z1N);
		shouldEqualT(ph.z[2], z1N);
		shouldEqualT(ph.z[3], z1N);
		shouldEqualT(ph.z[4], z1N);
		should.deepEqual(ph.r(0), new Complex(1,1));

		shouldEqualT(ph.r(0.1), new Complex(1.4, 1.2));
		shouldEqualT(ph.r(0.5), new Complex(3, 2));
		shouldEqualT(ph.r(0.6), new Complex(3.4, 2.2));
		shouldEqualT(ph.r(0.9), new Complex(4.6,2.8));
		shouldEqualT(ph.r(1), new Complex(5,3));
	});
	it("newtonRaphson(options) should solve PHCurve z coefficients", function() {
		var ph = new PHCurve([
			{x:1,y:1},
			{x:2,y:1.5},
			{x:4,y:2.5},
			{x:5,y:3},
		],{logger:logger});
		logger.debug("ph.z:", ph.z);
		shouldEqualT(ph.r(0), new Complex(1,1));
		shouldEqualT(ph.r(1), new Complex(5.014,3.007));
		ph.dumpJacobian();
		ph.newtonRaphson().should.equal(4);
		ph.newtonRaphson().should.equal(1);
		shouldEqualT(ph.r(0), new Complex(1,1));
		shouldEqualT(ph.r(0.1), new Complex(1.172,1.086));
		shouldEqualT(ph.r(0.5), new Complex(3,2));
		shouldEqualT(ph.r(0.6), new Complex(3.629,2.314));
		shouldEqualT(ph.r(0.9), new Complex(4.828,2.914));
		shouldEqualT(ph.r(1), new Complex(5,3));
	});
})
