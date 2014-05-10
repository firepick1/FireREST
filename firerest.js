console.log("loading express...");
var express = require('express');
var fs = require('fs');
var app = express();
var __appdir = "www";
app.use(express.static(__appdir));
app.use(express.bodyParser());

console.log("loading firerest.js...");


app.get('/firemote/cv/1/camera.jpg', function(req, res){
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendfile('/dev/firefuse/cv/1/camera.jpg');
});
app.get('/firemote/cv/1/output.jpg', function(req, res){
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendfile('/dev/firefuse/cv/1/output.jpg');
});
app.get('/firemote/cv/1/monitor.jpg', function(req, res){
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendfile('/dev/firefuse/cv/1/monitor.jpg');
});
app.get('/firemote/cv/1/gray/cve/calc-offset/save.json', function(req, res){
  res.setHeader('Content-Type', 'application/json');
  res.sendfile('/dev/firefuse/cv/1/gray/cve/calc-offset/save.json');
});
app.get('/firemote/cv/1/gray/cve/calc-offset/process.json', function(req, res){
  res.setHeader('Content-Type', 'application/json');
  res.sendfile('/dev/firefuse/cv/1/gray/cve/calc-offset/process.json');
});

var firerest_port=8001;
app.listen(firerest_port);
console.log('FireREST listening on port ' + firerest_port);
