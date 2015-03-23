var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");

(function(firepick) {
    var that = {};

    function Tridiagonal(n,options) {
		var that = this;
		options = options || {};
		should.exist(n);
		n.should.be.above(0);
		that.n = n;
		that.n2 = Math.ceil(n/2);
		that.logger = options.logger || new Logger(options);
		return that;
    };

    ///////////////// INSTANCE ///////////////
	Tridiagonal.prototype.solve = function(a,b,c,d) {
		var that = this;

		a.length.should.equal(that.n);
		b.length.should.equal(that.n);
		c.length.should.equal(that.n);
		d.length.should.equal(that.n);

		if (that.cprime == null) {
			that.cprime = [];
			for (var i=0; i < that.n; i++) {
				that.cprime.push(0);
			}
		}
	 
		that.cprime[0] = c[0] / b[0];
		var x = [d[0] / b[0]];
	 
		for (var i=1; i < that.n; i++) {
			var m = 1.0 / (b[i] - a[i] * that.cprime[i-1]);
			that.cprime[i] = c[i] * m;
			x.push((d[i] - a[i] * x[i-1]) * m);
		}
	 
		for (var i=that.n-1; i-- > 0; ) {
			x[i] = x[i] - that.cprime[i] * x[i+1];
		}
		return x;
	};

    Logger.logger.info("loaded firepick.Tridiagonal");
    module.exports = firepick.Tridiagonal = Tridiagonal;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Tridiagonal", function() {
	var Tridiagonal = firepick.Tridiagonal;
	it("new Tridiagonal(5) should create a 5-degree Tridiagonal instance", function() {
		var b5 = new Tridiagonal(5);
		b5.should.have.properties({n:5,n2:3});
	});
	it("solve(a,b,c,d) should solve tridiagonal [abc][x]=[d]", function() {
		var tr4 = new Tridiagonal(4);
		var a = [0, -1, -1, -1];
		var b = [4, 4, 4, 4];
		var c = [-1, -1, -1, 0];
	 	var d = [5,  5, 10, 23];
		var x = tr4.solve(a,b,c,d);
		should.deepEqual(x, [2,3,5,7]);
	});
})
