var Handlebars = require('handlebars');
var JSCompiler = Handlebars.JavaScriptCompiler.prototype;

var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(JSCompiler);
Compiler.prototype.compiler = Compiler;
