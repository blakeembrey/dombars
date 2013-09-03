var runtime = require('handlebars/lib/handlebars/runtime');

exports.attach = function(DOMBars) {
  runtime.attach(DOMBars);

  DOMBars.VM.template = DOMBars.template = function (templateSpec) {
    var container = {
      isElement: DOMBars.Utils.isElement,
      domifyExpression: DOMBars.Utils.domifyExpression,
      textifyExpression: DOMBars.Utils.textifyExpression,
      invokePartial: DOMBars.VM.invokePartial,
      escapeExpression: DOMBars.Utils.escapeExpression,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = DOMBars.VM.program(i, fn, data);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = DOMBars.VM.program(i, fn);
        }
        return programWrapper;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common) {
          ret = {};
          DOMBars.Utils.extend(ret, common);
          DOMBars.Utils.extend(ret, param);
        }
        return ret;
      },
      programWithDepth: DOMBars.VM.programWithDepth,
      noop: DOMBars.VM.noop,
      compilerInfo: null
    };

    return function (context, options) {
      options = options || {};
      var result = templateSpec.call(container, DOMBars, context, options.helpers, options.partials, options.data);

      var compilerInfo     = container.compilerInfo || [];
      var compilerRevision = compilerInfo[0] || 1;
      var currentRevision  = DOMBars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions  = DOMBars.REVISION_CHANGES[currentRevision];
          var compilerVersions = DOMBars.REVISION_CHANGES[compilerRevision];
          throw new Error('Template was precompiled with an older version of ' +
            'DOMBars than the current runtime. Please update your precompiler' +
            ' to a newer version (' + runtimeVersions + ') or downgrade your ' +
            'runtime to an older version (' + compilerVersions + ').');
        } else {
          throw new Error('Template was precompiled with a newer version of' +
            'DOMBars than the current runtime. Please update your runtime to ' +
            'a newer version (' + compilerInfo[1] + ').');
        }
      }

      return result;
    };
  };
};
