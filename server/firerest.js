console.log("loading express...");
var express = require('express');
var fs = require('fs');
var app = express();

var firefuse_dir = "/dev/firefuse";
console.log("Looking for FireFUSE...");
if (fs.existsSync("/dev/firefuse/cv/1/camera.jpg")) {
  app.use('/firerest', express.static(firefuse_dir));
  console.log("Found FireFUSE!");
  console.log("Mapping /firerest to: " + firefuse_dir);
} else {
  console.log("FireFUSE is not available. FireREST is demo mode only" );
}

var __appdir = "www";
app.use(express.static(__appdir));
console.log("Mapping / to: " + __appdir);
app.use(express.bodyParser());

var firerest_port=8001;
app.listen(firerest_port);
console.log('FireREST listening on port ' + firerest_port);
