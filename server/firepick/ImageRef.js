var should = require("should"),
    module = module || {},
    firepick;
var child_process = require('child_process');
var fs = require('fs');
var temp = require('temp');
temp.track();

(function(firepick) {
    function ImageRef(x,y,z,state,version) {
        this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
		if (typeof state === 'string') { this.state = state; }
		if (version) { this.version = version }
        return this;
    }

	//////////////// CLASS //////////////////////
	ImageRef.copy = function(refSrc) {
		return new ImageRef(refSrc.x, refSrc.y, refSrc.z, refSrc.state, refSrc.version);
	}
	ImageRef.nameOf = function(imgRef, prefix, suffix) {
		var fname = (prefix || "") + "_" + imgRef.x + "_" + imgRef.y + "_" + imgRef.z;

		if (imgRef.state || imgRef.version) {
			fname += "#" + (imgRef.state || "");
		}
		if (imgRef.version) {
			fname += "_" + imgRef.version;
		}
		return fname + (suffix || "");
	}
	ImageRef.parse = function(path) {
		var $tokens = path.split('#');
		var _tokens = $tokens[0].split('_');
		if ($tokens.length > 1) {
			var _tokens1 = $tokens[1].split('_');
			_tokens.push(_tokens1[0]);
			var suffixTokens = _tokens1[1].split('.');
			_tokens.push(suffixTokens[0]);
		}
		return new firepick.ImageRef(
			Number(_tokens[1]), /* x */
			Number(_tokens[2]), /* y */
			Number(_tokens[3]), /* z */
			_tokens[4], /* state */
			_tokens[5]); /* version */
	};
	ImageRef.compare = function(img1,img2) {
		var cmp = 
			((img1.x||0) - (img2.x||0)) ||
			((img1.y||0) - (img2.y||0)) ||
			((img1.z||0) - (img2.z||0));
		if (cmp === 0) {
			var s1 = img1.state || "";
			var s2 = img2.state || "";
			cmp = (s1 === s2 ? 0 : (s1 < s2 ? -1 : 1));
		}
		cmp = cmp || ((img1.version || 0) - (img2.version || 0));
		return cmp;
	}

	//////////////// INSTANCE /////////////////////
	ImageRef.prototype.copy = function() {
		return ImageRef.copy(this);
	}
    ImageRef.prototype.setVersion = function(version) {
		this.version = version || 0;
		return this;
    }
    ImageRef.prototype.setState = function(state) {
		this.state = state;
		return this;
    }
	ImageRef.prototype.name = function(prefix, suffix) {
		return ImageRef.nameOf(this, prefix, suffix);
	}
	ImageRef.prototype.compare = function(that) {
		return ImageRef.compare(this, that);
	}

    console.log("LOADED	: firepick.ImageRef");
    module.exports = firepick.ImageRef = ImageRef;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.ImageRef test", function() {
    var ref000 = new firepick.ImageRef();
	var ref123 = new firepick.ImageRef(1,2,3);

    it("should be created", function() {
        should.equal(0, ref000.x);
        should.equal(0, ref000.y);
        should.equal(0, ref000.z);
        should.equal(1, ref123.x);
        should.equal(2, ref123.y);
        should.equal(3, ref123.z);
	});
    it("should be comparable", function() {
        should.equal(0, firepick.ImageRef.compare({x:0,y:0,z:0},ref000));
        should.equal(0, firepick.ImageRef.compare({z:3,y:2,x:1},ref123));
        should(firepick.ImageRef.compare(ref000,ref123)).be.below(0);
        should(firepick.ImageRef.compare(ref123,ref000)).be.above(0);
        should(firepick.ImageRef.compare({x:0,y:0,z:0},{x:0,y:0,z:3})).be.below(0);
		should(ref000.compare(ref123)).be.below(0);
    });
	it("should copy", function() {
		var ref123a4 = new firepick.ImageRef(1,2,3,"a",4);
		var ref123a4_copy1 = ref123a4.copy();
		var ref123a4_copy2 = firepick.ImageRef.copy(ref123a4);
		should.equal(0, ref123a4.compare(ref123a4_copy1));
		should.equal(0, ref123a4.compare(ref123a4_copy2));
		should.equal(0, ref123a4_copy1.compare(ref123a4_copy2));
		should.equal(0, ref123a4_copy1.compare({version:4,state:"a",z:3,y:2,x:1}));
	});
	it("should have a name", function() {
		var ref123a4 = new firepick.ImageRef(1,2,3,"a",4);
		var ref123_4 = ref123.copy().setVersion(4);
		var ref123b = ref123.copy().setState('b');
		should.equal("_1_2_3", ref123.name());
		should.equal("prefix_1_2_3.jpg", ref123.name("prefix",".jpg"));
		should.equal("prefix_1_2_3#a_4.jpg", ref123a4.name("prefix",".jpg"));
		should.equal("_1_2_3#_4.jpg", ref123_4.name("",".jpg"));
		should.equal("prefix_1_2_3#b", ref123b.name("prefix"));
	});
	it("should have a parseable name", function() {
		var ref123a5 = new firepick.ImageRef(1,2,3,"a",5);
		var name123a5 = ref123a5.name("/a/b/c",".jpg");
		var refParse = firepick.ImageRef.parse(name123a5);
		console.log(JSON.stringify(ref123a5));
		console.log(JSON.stringify(refParse));
		should.equal(0, firepick.ImageRef.compare(refParse, ref123a5));
	});
});
