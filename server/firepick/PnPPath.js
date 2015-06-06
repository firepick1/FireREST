var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");
Bernstein = require("./Bernstein");
Tridiagonal = require("./Tridiagonal");
PHFactory = require("./PHFactory");
PH5Curve = require("./PH5Curve");
PHFeed = require("./PHFeed");


(function(firepick) {

    function PnPPath(pt1,pt2,options) {
		var that = this;

		pt1.should.have.properties(['x','y','z']);
		pt2.should.have.properties(['x','y','z']);
		that.pt1 = pt1;
		that.pt2 = pt2;

		options = options || {};
		that.logger = options.logger || new Logger(options);

		return that;
    };

	///////////////// INSTANCE API ///////////////
	PnPPath.prototype.position = function(tau) {
		var that = this;
		var x = that.pt1.x;
		var y = that.pt1.y;
		var z = that.pt1.z;
		if (tau <= 0) {
			return that.pt1;
		}
		if (tau >= 1) {
			return that.pt2;
		}

		return {x:x,y:y,z:z};
	};

	///////////////// CLASS //////////


    Logger.logger.info("loaded firepick.PnPPath");
    module.exports = firepick.PnPPath = PnPPath;
})(firepick || (firepick = {}));


(typeof describe === 'function') && describe("firepick.PnPPath", function() {
	var logger = new Logger({
		nPlaces:1,
		logLevel:"debug"
	});
	var PnPPath = firepick.PnPPath;
	var epsilon = 0.000001;
	function shouldEqualT(c1,c2,epsilon) { 
		epsilon = epsilon || 0.001; 
		c1.should.instanceof(Complex);
		c2.should.instanceof(Complex);
		c1.isNear(c2, epsilon).should.equal(true, 
			"expected:" + c2.stringify({nPlaces:3}) +
			" actual:" + c1.stringify({nPlaces:3}));
	};
	var pt1 = {x:10, y:20, z:30};
	var pt2 = {x:-90, y:21, z:40};

	it("TESTTESTposition(0) should return first point", function() {
		var pnp = new PnPPath(pt1, pt2, {});

		pnp.position(0).should.have.properties({
			x:pt1.x,
			y:pt1.y,
			z:pt1.z
		});
	});
	it("TESTTESTposition(1) should return last point", function() {
		var pnp = new PnPPath(pt1, pt2, {});

		pnp.position(1).should.have.properties({
			x:pt2.x,
			y:pt2.y,
			z:pt2.z
		});
	});
})
