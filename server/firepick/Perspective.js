var should = require("should"),
    module = module || {},
    firepick;

(function(firepick) {
    function Perspective(refImg1, pos1, refImg2, pos2) {
		var that = this;

		refImg1.should.be.above(0);
		refImg2.should.be.above(0);
		pos1.should.be.Number;
		pos2.should.be.Number;

		that.refImg1 = refImg1;
		that.pos1 = pos1;
		that.refImg2 = refImg2;
		that.pos2 = pos2;
		that.pos0 = (refImg1*pos1 - refImg2*pos2)/(refImg1-refImg2);
		that.refSize = refImg1 * (pos1-that.pos0);

        return that;
    };

    ////////// INSTANCE ////////////
    Perspective.prototype.viewPosition = function(imgSize) {
		var that = this;
		return that.pos0 + that.refSize/imgSize;
    }
	Perspective.prototype.objectPosition = function() {
		var that = this;
		return that.pos0;
	}

    Logger.logger.info("loaded firepick.Perspective");
    module.exports = firepick.Perspective = Perspective;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Perspective test", function() {
	var Perspective = firepick.Perspective;

	it("TESTTESTshould create a Perspective given two reference images", function() {
		var refImg1 = 3;	// reference image size at pos1
		var pos1 = 10;	// reference image1 position
		var refImg2 = 6;	// reference image size at pos2
		var pos2 = 20;	// reference image2 position
		var pv = new Perspective(refImg1, pos1, refImg2, pos2);
		pv.refImg1.should.equal(refImg1);
		pv.refImg2.should.equal(refImg2);
		pv.pos1.should.equal(pos1);
		pv.pos2.should.equal(pos2);
	});
	it("TESTTESTobjectPosition() should return the object position", function() {
		var refImg1 = 3;	// reference image size at pos1
		var pos1 = 10;	// reference image1 position
		var refImg2 = 6;	// reference image size at pos2
		var pos2 = 20;	// reference image2 position
		var pv = new Perspective(refImg1, pos1, refImg2, pos2);
		pv.objectPosition().should.equal(30);
	});
	it("TESTTESTviewPosition() should return viewer position given an image size", function() {
		var refImg1 = 3;	// reference image size at pos1
		var pos1 = 10;	// reference image1 position
		var refImg2 = 6;	// reference image size at pos2
		var pos2 = 20;	// reference image2 position
		var pv = new Perspective(refImg1, pos1, refImg2, pos2);
		pv.viewPosition(1.5).should.equal(-10);
		pv.viewPosition(3).should.equal(pos1);
		pv.viewPosition(6).should.equal(pos2);
		pv.viewPosition(12).should.equal(25);
	});
});
