var Handlebars     = require('handlebars');
var CommonCompiler = require('./common').prototype;

/**
 * Attribute compiler.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(CommonCompiler);
Compiler.prototype.compiler = Compiler;
