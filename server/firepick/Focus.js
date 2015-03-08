var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.ImageProcessor = require("./ImageProcessor");
firepick.ImageRef = require("./ImageRef");
firepick.XYZCamera = require("./XYZCamera");
firepick.Evolve = require("./Evolve");
firepick.FPD = require("./FPD");
Util = require("./Util");

(function(firepick) {
	var that;
    function Focus(xyzCam, zMin, zMax, options) {
		that = this;
		options = options || {};
		firepick.XYZCamera.isInterfaceOf(xyzCam);
		that.xyzCam = xyzCam;
        should(zMin).be.a.Number;
        should(zMax).be.a.Number;
		should(zMin).be.below(zMax);
        that.zMin = zMin;
        that.zMax = zMax;
		that.nPlaces = options.nPlaces || 0;
		that.maxGenerations = options.maxGenerations || 20;
		should(that.nPlaces).not.below(0);
		that.captureCount = 0;
		that.ip = new firepick.ImageProcessor();
        return that;
    };

    /////////////// INSTANCE ////////////
    Focus.prototype.isDone = function(index, generation) {
        var zFirst = generation[0];
        var zLast = generation[generation.length - 1];
        var done = index >= that.maxGenerations;	// non-convergence cap
		done = done || index > 1 && Math.abs(zLast - zFirst) <= 1;	// candidates roughly same
		if (that.lastCandidate !== zFirst) {
			that.lastCandidate = zFirst;
			that.lastCandidateIndex = index;
		}
		done = done || (index - that.lastCandidateIndex >= 3); // elite survived three generations
		console.log(index + " " + JSON.stringify(generation));
		return done;
    };

    Focus.prototype.generate = function(z1, z2) {
        var kids = [Util.roundN(firepick.Evolve.mutate(z1, that.zMin, that.zMax),that.nPlaces)]; // broad search
        if (z1 === z2) {
			kids.push(Util.roundN(firepick.Evolve.mutate(z1, that.zMin, that.zMax),that.nPlaces)); // broad search
        } else { // deep search
            var spread = Math.abs(z1-z2);
            var low = Math.max(that.zMin, z1 - spread);
            var high = Math.min(that.zMax, z1 + spread);
            kids.push(Util.roundN(firepick.Evolve.mutate(z1, low, high),that.nPlaces));
        }

        return kids;
    };
    Focus.prototype.compare = function(z1, z2) {
        var cmp = that.sharpness(z2) - that.sharpness(z1);
		if (cmp === 0) {
			return z1 - z2;
		}
		return cmp;
    };
	Focus.prototype.sharpness = function(z) {
		var imgRef = that.xyzCam.imageRef({x:0,y:0,z:z});
		if (!imgRef.exists() || imgRef.sharpness == null) {
			that.captureCount++;
			imgRef = that.xyzCam.moveTo(imgRef).capture();
			imgRef.sharpness = that.ip.sharpness(imgRef).sharpness;
		}
        return imgRef.sharpness;
	};
	Focus.prototype.calcSharpestZ = function() {
        var evolve = new firepick.Evolve(that, {nSurvivors:5});
        var guess1 = (that.zMin + that.zMax)/2;
        var epsilon = 0.01;
		that.lastCandidateAge = 0;
		var vSolve = evolve.solve([guess1]);
		var z = vSolve[0];
		return {z:z, sharpness:that.sharpness(z)};
	};

    console.log("LOADED	: firepick.Focus");
    module.exports = firepick.Focus = Focus;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Focus", function() {
    var ip = new firepick.ImageProcessor();
	var fpd = new firepick.FPD();
	var mockXYZCam = new firepick.XYZCamera(); // mock images
	var xyzCam = fpd.health() < 1 ? mockXYZCam : fpd;
	var focus = new firepick.Focus(xyzCam, -110, 20);
	it("compute the sharpness at {x:0,y:0,z:0}", function() {
		var captureOld = focus.captureCount;
		var sharpness = focus.sharpness(0);
		should(sharpness).within(278.8,278.9);
		should(focus.captureCount).equal(captureOld+1);
	});
	it("compute the sharpness at {x:0,y:0,z:-5}", function() {
		var captureOld = focus.captureCount;
		var sharpness = focus.sharpness(-5);
		should(sharpness).within(313.4,313.5);
		should(focus.captureCount).equal(captureOld+1);
	});
	it("should only capture a coordinate once for sharpness", function() {
		var captureOld = focus.captureCount;
		var sharpness = focus.sharpness(-5);
		should(sharpness).within(313.4,313.5);
		should(focus.captureCount).equal(captureOld);
	});
	it("should calculate the Z-axis coordinate with the sharpest images", function() {
		this.timeout(50000);
		var captureOld = focus.captureCount;
		var result = focus.calcSharpestZ();
		should(result.z).within(-20,-15);
		should(result.sharpness).within(338.6,338.7);
		should(focus.captureCount-captureOld).below(50);
	});
});
