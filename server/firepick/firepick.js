var module = module || {}; /* nodejs module */
var firepick = firepick || {}; /* browser module*/
module.exports = firepick;

firepick.Calibrate = require('./Calibrate.js');
firepick.Camera = require('./Camera.js');
firepick.FireFUSECamera = require('./FireFUSECamera.js');
firepick.XYZPositioner = require('./XYZPositioner.js');
