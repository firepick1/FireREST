var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
var path = require("path");
var os = require("os");
firepick.Camera = require("./Camera");
firepick.ImageRef = require("./ImageRef");

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
    function ImageStore(camera, options) {
		this.camera = camera || new firepick.Camera();
		this.images = options && options.images || {};
		this.path = options && options.path || os.tmpDir();
		this.prefix = options && options.prefix || "ImageStore";
		this.suffix = options && options.suffix || ".jpg";
        return this;
    }
	/////////////// INSTANCE ////////////
	ImageStore.prototype.health = function() {
		return this.camera.health();
	};
	ImageStore.prototype.pathOf = function(imgRef) {
		if (imgRef) {
			var name = firepick.ImageRef.nameOf(imgRef, this.prefix, this.suffix);
			return path.join(os.tmpDir(),name);
		} else {
			return this.camera.path;
		}
	};
	ImageStore.prototype.parseImageRef = function(path) {
		var suffixPos = path.lastIndexOf(this.suffix);
		path = suffixPos < 0 ? path : path.slice(0, suffixPos);
		var prefixPos = path.indexOf(this.prefix);
		path = prefixPos < 0 ? path: path.slice(prefixPos+this.prefix.length);
		return firepick.ImageRef.parse(path);
	}
	ImageStore.prototype.clear = function() {
		this.images = {};
		return this;
	};
	ImageStore.prototype.peek = function(imgRef) { 
		should.exist(imgRef);
		var name = firepick.ImageRef.nameOf(imgRef, this.prefix, this.suffix);
		return this.images[name];
	}
	ImageStore.prototype.load = function(imgRef, srcPath) { 
		imgRef = imgRef instanceof firepick.ImageRef ? 
			imgRef : firepick.ImageRef.copy(imgRef);
		srcPath = srcPath || imgRef.path;
		should.exist(srcPath);
		var name = firepick.ImageRef.nameOf(imgRef, this.prefix, this.suffix);
		this.images[name] = firepick.ImageRef.copy(imgRef);
		var dstPath = this.pathOf(imgRef);
		fs.writeFileSync(dstPath, fs.readFileSync(srcPath));
		return this.images[name] = imgRef;
	}
	ImageStore.prototype.capture = function(imgRef, camera2) { 
		should.exist(imgRef);
		var camera = camera2 || this.camera;
		camera.capture();
		return this.load(imgRef, camera.path);
	}
	ImageStore.prototype.image = function(imgRef, camera2) { 
		should.exist(imgRef);
		var name = firepick.ImageRef.nameOf(imgRef, this.prefix, this.suffix);
		if (this.images[name] == null) {
			this.capture(imgRef, camera2);
		}
		return this.images[name];
	}
	
	/////////////// GLOBAL /////////////
	ImageStore.validate = function(imgStore) {
		describe("ImageStore.validate(" + imgStore.constructor.name + ")", function() {
			var ref123 = new firepick.ImageRef(1,2,3,{state:"test",version:1});
			it("should implement pathOf", function() {
				var path123 = imgStore.pathOf(ref123);
				should(path123.indexOf("_1_2_3")).above(-1);
				should(path.basename(path123)).equal(imgStore.prefix+"_1_2_3#test_1"+imgStore.suffix);
			});
			it("should parse an ImageREf from a path", function() {
				var path123 = imgStore.pathOf(ref123);
				var parse123 = imgStore.parseImageRef(path123);
				should.equal(0, firepick.ImageRef.compare(parse123, ref123));
			});
			var stat1;
			var img123;
			it("should return unique, client-mutable image", function() {
				img123 = imgStore.image(ref123);
				should.exist(img123);
				should.not.exist(img123.size);
				var stat1 = fs.statSync(imgStore.pathOf(ref123));
				should.exist(stat1);
				img123.size = stat1.size;
				img123["color"] = "pink";
				var img2 = imgStore.image(ref123);
				should(img123.color).equal(img2.color);
			});
			it("should implement peek", function() {
				var ref911 = new firepick.ImageRef(9,1,1,{state:"ImageStore", version:5})
				should.not.exist(imgStore.peek(ref911));
				var peek123 = imgStore.peek(ref123);
				should.exist(peek123);
				should(peek123.color).equal("pink");
			});
			it("should clear", function() {
				should(imgStore.clear()).equal(imgStore);
				should.not.exist(imgStore.peek(ref123));
			});
			var camera2 = new firepick.Camera([
				"test/camX1Y0Z0.jpg",
			]);
			it("should support multiple cameras", function() {
				var img123_2 = imgStore.image(ref123, camera2);
				should.exist(img123_2);
				var stat123_2 = fs.statSync(imgStore.pathOf(img123_2));
				var stat100 = fs.statSync("test/camX1Y0Z0.jpg");
				should.equal(stat123_2.size,stat100.size);
			});
			it("should load an external image", function() {
				var raw123_6 = {x:1,y:2,z:3, state:"test", version:6};
				var ref123_6 = firepick.ImageRef.copy(raw123_6);
				var peek123_6 = imgStore.peek(raw123_6);
				should.not.exist(peek123_6);
				imgStore.load(raw123_6, "test/camX0Y0Z0a.jpg");
				peek123_6 = imgStore.peek(raw123_6);
				should.deepEqual(peek123_6, ref123_6);
				should.notStrictEqual(peek123_6, ref123_6);
				var ref123_7 = new firepick.ImageRef(1,2,3,
					{state:"test",version:7,path:"test/camX0Y0Z0a.jpg"});
				var peek123_7 = imgStore.peek(ref123_7);
				should.not.exist(peek123_7);
				peek123_7 = imgStore.load(ref123_7);
				should.deepEqual(peek123_7, ref123_7);
			});
		});
		return true;
	};

    console.log("LOADED	: firepick.ImageStore");
    module.exports = firepick.ImageStore = ImageStore;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.ImageStore test", function() {
	var camera1 = new firepick.Camera([ "test/camX0Y0Z0a.jpg" ]);
	var camera2 = new firepick.Camera([ "test/camX0Y0Z0a.jpg" ]);
	var imgStore = new firepick.ImageStore(camera1);
	var imgStoreTest = new firepick.ImageStore(camera2, { prefix:"Test", suffix:".JPG" });
	firepick.ImageStore.validate(imgStore);
	firepick.ImageStore.validate(imgStoreTest);
})
