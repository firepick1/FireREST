var should = require("should"),
    module = module || {},
    firepick = firepick || {};
var fs = require("fs");
var path = require("path");
var os = require("os");
firepick.Camera = require("./Camera");
firepick.ImageStore = require("./ImageStore");
firepick.ImageRef = require("./ImageRef");
firepick.FPD = require("./FPD");

(function(firepick) {
    function Focus(options) {
        return this;
    }
	/////////////// INSTANCE ////////////
	

    console.log("LOADED	: firepick.Focus");
    module.exports = firepick.Focus = Focus;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Focus test", function() {
	var images = [
		{z:20,y:0,x:0, path:"test/XP005_Z20X0Y0@1#1.jpg"},
		{z:15,y:0,x:0, path:"test/XP005_Z15X0Y0@1#1.jpg"},
		{z:10,y:0,x:0, path:"test/XP005_Z10X0Y0@1#1.jpg"},
		{z:5,y:0,x:0, path:"test/XP005_Z5X0Y0@1#1.jpg"},
		{z:0,y:0,x:0, path:"test/XP005_Z0X0Y0@1#1.jpg"},
		{z:-005,y:0,x:0, path:"test/XP005_Z-005X0Y0@1#1.jpg"},
		{z:-010,y:0,x:0, path:"test/XP005_Z-010X0Y0@1#1.jpg"},
		{z:-015,y:0,x:0, path:"test/XP005_Z-015X0Y0@1#1.jpg"},
		{z:-020,y:0,x:0, path:"test/XP005_Z-020X0Y0@1#1.jpg"},
		{z:-025,y:0,x:0, path:"test/XP005_Z-025X0Y0@1#1.jpg"},
		{z:-030,y:0,x:0, path:"test/XP005_Z-030X0Y0@1#1.jpg"},
		{z:-035,y:0,x:0, path:"test/XP005_Z-035X0Y0@1#1.jpg"},
		{z:-040,y:0,x:0, path:"test/XP005_Z-040X0Y0@1#1.jpg"},
		{z:-045,y:0,x:0, path:"test/XP005_Z-045X0Y0@1#1.jpg"},
		{z:-050,y:0,x:0, path:"test/XP005_Z-050X0Y0@1#1.jpg"},
		{z:-055,y:0,x:0, path:"test/XP005_Z-055X0Y0@1#1.jpg"},
		{z:-060,y:0,x:0, path:"test/XP005_Z-060X0Y0@1#1.jpg"},
		{z:-065,y:0,x:0, path:"test/XP005_Z-065X0Y0@1#1.jpg"},
		{z:-070,y:0,x:0, path:"test/XP005_Z-070X0Y0@1#1.jpg"},
		{z:-075,y:0,x:0, path:"test/XP005_Z-075X0Y0@1#1.jpg"},
		{z:-080,y:0,x:0, path:"test/XP005_Z-080X0Y0@1#1.jpg"},
		{z:-085,y:0,x:0, path:"test/XP005_Z-085X0Y0@1#1.jpg"},
		{z:-090,y:0,x:0, path:"test/XP005_Z-090X0Y0@1#1.jpg"},
		{z:-095,y:0,x:0, path:"test/XP005_Z-095X0Y0@1#1.jpg"},
		{z:-100,y:0,x:0, path:"test/XP005_Z-100X0Y0@1#1.jpg"},
		{z:-105,y:0,x:0, path:"test/XP005_Z-105X0Y0@1#1.jpg"},
		{z:-110,y:0,x:0, path:"test/XP005_Z-110X0Y0@1#1.jpg"},
	];
	var is = new firepick.ImageStore(null, { images:images });
	var fpd = new firepick.FPD({imgStore:is});
	for (var i=0; i < images.length; i++) {
		is.load(images[i]);
		images[i].sharpness = fpd.imgSharpness(images[i]).sharpness;
		console.log(JSON.stringify(images[i]));
	}
});
