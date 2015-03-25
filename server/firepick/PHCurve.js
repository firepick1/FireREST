var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
Bernstein = require("./Bernstein");

(function(firepick) {
    function PHCurve(pts,options) {
		var that = this;
		options = options || {};
		that.degree = options.degree || 5;
		that.degree.should.equal(5);  // only support quintics
		that.degree2 = Math.ceil(that.degree/2);
		pts.should.be.Array;
		pts.length.should.be.above(2);
		that.N = pts.length-1;
		that.q = pts;
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
		that.logger = options.logger || new Logger(options);
		return that;
    };

    ///////////////// INSTANCE ///////////////
	PHCurve.prototype.rt = function(T) {
		var that = this;
		T.should.not.be.below(0);
		T.should.not.be.above(1);
		var TN = T * that.N;
		var i = Math.ceil(TN);
		return that.rit(i,TN-i+1);
	};
	PHCurve.prototype.rit = function(i,t) {
		var that = this;
		i.should.not.be.below(0);
		i.should.not.be.above(that.N);
		t.should.not.be.below(0);
		t.should.not.be.above(1);
		var sum = new Complex();
		var t1 = 1-t;
		var tk = [1];
		var t1k = [1];
		for (var k=1; k<=that.degree; k++) {
			tk.push(t*tk[k-1]);
			t1k.splice(0, 0, t1*t1k[0]);
		}
		for (var k=0; k<=5; k++) {
			sum.add(
				Complex.times(
					that.pik(i,k),
					Util.choose(5,k) * t1[k] * t[k]
				)
			);
		}
		return sum;
	};
	PHCurve.prototype.wij = function(i,j) {
		var that = this;
		switch (j) {
		case 0:return Complex.times(1/2,that.z[i-1].plus(that.z[i]));
		case 1:return that.z[i];
		case 2:return Complex.times(1/2,that.z[i].plus(that.z[i+1]));
		default: should.fail("wij j:"+j);
		}
	};
	PHCurve.prototype.pik = function(i,k) {
		var that = this;
		i.should.be.above(0);
		i.should.not.be.above(that.N);

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

	///////////////// CLASS //////////

    Logger.logger.info("loaded firepick.PHCurve");
    module.exports = firepick.PHCurve = PHCurve;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.PHCurve", function() {
	var PHCurve = firepick.PHCurve;
	var pts = [
		{x:0,y:0},
		{x:1,y:0},
		{x:2,y:1},
		{x:3,y:1},
		{x:4,y:1},
	];
	it("new PHCurve(5,[pts]) should create a 5-degree PHCurve instance", function() {
		var ph5 = new PHCurve(pts);
		ph5.should.have.properties({degree:5,degree2:3});
	});
	it("V(vin,vout,t) should interpolate velocity on interval t:[0,1]", function() {
		var ph5 = new PHCurve(pts);
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
		var ph5 = new PHCurve(pts);
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
})
