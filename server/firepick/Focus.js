var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.ImageProcessor = require("./ImageProcessor");
firepick.ImageRef = require("./ImageRef");
firepick.XYZCamera = require("./XYZCamera");
firepick.Evolve = require("./Evolve");

(function(firepick) {
    function Focus(xyzCam, zMin, zMax, options) {
		should.ok(firepick.XYZCamera.instance(xyzCam));
        should(zMin).be.a.Number;
        should(zMax).be.a.Number;
		should(zMin).be.below(zMax);
		this.xyzCam = xyzCam;
        this.zMin = zMin;
        this.zMax = zMax;
        return this;
    };

    /////////////// INSTANCE ////////////
    Focus.prototype.isDone = function(z, generation) {
        var zFirst = generation[0];
        var zLast = generation[generation.length - 1];
        return Math.abs(zLast - zFirst) <= 1;
    };

    Focus.prototype.generate = function(z1, z2, mutate) {
        var kids = [mutate(z1, this.zMin, this.zMax)]; // broad search
        if (z1 === z2) {
			kids.push(mutate(z1, this.zMin, this.zMax)); // broad search
        } else { // deep search
            var spread = Math.abs(z1-z2);
            var low = Math.max(this.zMin, z1 - spread);
            var high = Math.min(this.zMax, z1 + spread);
            kids.push(mutate(z1, low, high));
        }

        return kids;
    };

	Focus.prototype.sharpness = function(z) {
	};

    Focus.prototype.compare = function(z1, z2) {
        return this.sharpness(z1) - this.sharpness(z2);
    };

    console.log("LOADED	: firepick.Focus");
    module.exports = firepick.Focus = Focus;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Focus", function() {
    var ip = new firepick.ImageProcessor();
    //images[i].sharpness = ip.sharpness(images[i]).sharpness;
    //        console.log(JSON.stringify(images[i]));
});
