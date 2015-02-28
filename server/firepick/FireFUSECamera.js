var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var child_process = require('child_process');
var fs = require('fs');
var temp = require('temp');
temp.track();
firepick.Camera = require('./Camera');
	
var firefuse_path = "/dev/firefuse/cv/1/camera.jpg";

(function(firepick) {
    function FireFUSECamera(path) {
		this.path = path || firefuse_path;
		try { 
			fs.statSync(this.path);
			this.available = true;
		} catch (err) {
			this.available = false;
		}
        return this;
    };
    FireFUSECamera.prototype.health = function() {
		return this.available ? 1 : 0;
	};
    FireFUSECamera.prototype.capture = function() {
		should.ok(this.available);
		var cmd = "truncate -s0 " + this.path;
		child_process.execSync(cmd);
		return this;
    };

	try { 
		fs.statSync(firefuse_path);
		console.log("LOADED	: firepick.FireFUSECamera is available");
	} catch (err) {
		console.log("ERROR	: firepick.FireFUSECamera is not available");
	}
    module.exports = firepick.FireFUSECamera = FireFUSECamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FireFUSECamera test", function() {
    var camera = new firepick.FireFUSECamera();
	var cam_bad = new firepick.FireFUSECamera("no/such/path");
	firepick.Camera.validate(camera);
	firepick.Camera.validate(cam_bad);
});
