var should = require("should"),
    module = module || {},
    firepick = firepick || {};
ImageProcessor = require("./ImageProcessor");
ImageRef = require("./ImageRef");
XYZCamera = require("./XYZCamera");
ImageRef = require("./ImageRef");
Util = require("./Util");
Logger = require("./Logger");
FireStep = require("./FireStep");
Perspective = require("./Perspective");

(function(firepick) {
	var logger = new Logger();

    function DeltaCalibrator(xyz, camera, options) {
        var that = this;

        XYZPositioner.validate(xyz);
		Camera.validate(camera);
		that.options = options || {};
        that.xyz = xyz;
		that.camera = camera;
		that.imgProc = that.options.imageProcessor || new ImageProcessor();

		// Options
        options = options || {};
		return that;
	}
	///////////////// CLASS //////////////////
	DeltaCalibrator.logger = logger;

    Logger.logger.info("loaded firepick.DeltaCalibrator");
    module.exports = firepick.DeltaCalibrator = DeltaCalibrator;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.DeltaCalibrator", function() {
	var DeltaCalibrator = firepick.DeltaCalibrator;
	var logLevel = "info";
	var logger = DeltaCalibrator.logger;
	
	it("TESTTESTshould calibrate a FireStep delta machine with a camera", function() {
		var fs = new FireStep();
		var camera = new Camera();
		var cal = new DeltaCalibrator(fs, camera);
		cal.camera.should.equal(camera);
		cal.xyz.should.equal(fs);
	});
});
