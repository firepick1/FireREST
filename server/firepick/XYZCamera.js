var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.XYZPositioner = require("./XYZPositioner");
firepick.MockCamera = require("./MockCamera");

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
    function XYZCamera(xyzPositioner, camera) {
        this.xyz = xyzPositioner || new firepick.XYZPositioner();
		should.ok(firepick.XYZPositioner.validate(this.xyz, "XYZCamera(xyzPositioner)"));
		this.camera = camera || new firepick.MockCamera();;
        return this;
    }
	XYZCamera.prototype.home = function() { this.xyz.home(); return this; };
	XYZCamera.prototype.origin = function() { this.xyz.origin(); return this; };
	XYZCamera.prototype.move = function(path) { this.xyz.move(path); return this; };
	XYZCamera.prototype.position = function(path) { return this.xyz.position(); };
	XYZCamera.prototype.isAvailable = function() { return this.xyz.isAvailable &&  this.xyz.isAvailable(); };

    console.log("LOADED	: firepick.XYZCamera");
    module.exports = firepick.XYZCamera = XYZCamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZCamera test", function() {
	var xyzCam = new firepick.XYZCamera();

	it("should be an XYZPositioner", function() {
		should.ok(firepick.XYZPositioner.validate(xyzCam, "XYZCamera"));
	});
})
