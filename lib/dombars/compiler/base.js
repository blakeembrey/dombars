var base = require('handlebars/lib/handlebars/compiler/base');

exports.attach = function (DOMBars) {
  base.attach(DOMBars);

  DOMBars.Parser = require('./parser');
  DOMBars.Parser.yy = DOMBars.AST;

  DOMBars.Compiler           = require('./compilers/base');
  DOMBars.JavaScriptCompiler = require('./compilers/javascript');

  DOMBars.precompile = function (input, options) {
    if (input == null || (typeof input !== 'string' && input.constructor !== DOMBars.AST.ProgramNode)) {
      throw new DOMBars.Exception('You must pass a string or DOMBars AST to DOMBars.precompile. You passed ' + input);
    }

    options = options || {};
    if (!('data' in options)) {
      options.data = true;
    }

    var ast         = DOMBars.parse(input);
    var environment = new DOMBars.Compiler().compile(ast, options);
    return new DOMBars.JavaScriptCompiler().compile(environment, options);
  };

  DOMBars.compile = function (input, options) {
    if (input == null || (typeof input !== 'string' && input.constructor !== DOMBars.AST.ProgramNode)) {
      throw new DOMBars.Exception('You must pass a string or DOMBars AST to DOMBars.compile. You passed ' + input);
    }

    options = options || {};
    if (!('data' in options)) {
      options.data = true;
    }

    var compiled;
    var compile = function () {
      var ast = DOMBars.parse(input);
      var environment = new DOMBars.Compiler().compile(ast, options);
      var templateSpec = new DOMBars.JavaScriptCompiler().compile(environment, options, undefined, true);
      return DOMBars.template(templateSpec);
    }

    return function (context, options) {
      if (!compiled) {
        compiled = compile();
      }
      return compiled.call(this, context, options);
    };
  };

  return DOMBars;
};
