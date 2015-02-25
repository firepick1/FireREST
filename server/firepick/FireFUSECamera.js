var should = require("should"),
    module = module || {},
    firepick;
var child_process = require('child_process');
var fs = require('fs');
var temp = require('temp');
temp.track();
	
var firefuse_path = "/dev/firefuse/cv/1/camera.jpg";
//var firefuse_path = "target/camera.jpg";

(function(firepick) {

    function FireFUSECamera(path) {
		this.path = path || firefuse_path;
		try { 
			this.stat = fs.statSync(this.path);
		} catch (err) {
			this.err = err;
		}
        return this;
    };
    FireFUSECamera.prototype.isAvailable = function() {
		return typeof this.err === 'undefined';
	};
    FireFUSECamera.prototype.capture = function() {
        if (this.err) {
			throw {error:"capture failed", cause:this.err};
		}

		var cmd = "cp " + this.path + " /dev/null";
		console.log(cmd);
		//var out = child_process.execSync(cmd);
    };

    console.log("firepick.FireFUSECamera");
    module.exports = firepick.FireFUSECamera = FireFUSECamera;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FireFUSECamera test", function() {
    var camera;
	var cam_bad;
	it("should be creatable", function() {
		should.exist(firepick, "firepick exists");
		should.exist(firepick.FireFUSECamera, "firepick.FireFUSECamera exists");
		should.doesNotThrow((function(){
			camera = new firepick.FireFUSECamera();
		}));
		should.exist(camera, "camera");
		should.doesNotThrow((function(){
			cam_bad = new firepick.FireFUSECamera("no/such/path")
		}), "no/such/path");
	});
    it("should have camera path", function() {
        should(camera.path).equal(firefuse_path,  'camera path');
        should(cam_bad.path).equal("no/such/path",  'camera path');
    });
	it("should throw error when capture without camera", function() {
		should.throws((function(){
			cam_bad.capture();
		}));
    });
	it("should be able to access Raspberry Pi camera via FireFUSE", function() {
		should.equal(camera.isAvailable(), true, "Raspberry Pi camera available as /dev/firefuse");
    });
	it("should capture images", function() {
		if (camera.isAvailable()) {
			var stats1 = fs.statSync(camera.path);
			camera.capture();
			var stats2 = fs.statSync(camera.path);
			camera.capture();
			should.notEqual(stats1.size, stats2.size, "successive captures should be different size");
		}
	});

});
