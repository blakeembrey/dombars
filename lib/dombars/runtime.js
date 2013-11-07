var runtime = require('handlebars/lib/handlebars/runtime');

/**
 * Attribute runtime features to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function(DOMBars) {
  runtime.attach(DOMBars);

  /**
   * Generate an executable template from a template spec.
   *
   * @param  {Object}   templateSpec
   * @return {Function}
   */
  DOMBars.VM.template = DOMBars.template = function (templateSpec) {
    var DOMBars = this;

    /**
     * The container object holds all the functions used by the template spec.
     *
     * @type {Object}
     */
    var container = DOMBars.createFrame(DOMBars.Utils);

    DOMBars.Utils.extend(container, {
      invokePartial: DOMBars.VM.invokePartial,
      programs: [],
      program: function (i, fn, data) {
        var programWrapper = this.programs[i];

        if (data) {
          return DOMBars.VM.program(i, fn, data);
        }

        if (!programWrapper) {
          return this.programs[i] = DOMBars.VM.program(i, fn);
        }

        return programWrapper;
      },
      merge: function (param, common) {
        var ret = param || common;

        if (param && common) {
          ret = {};
          DOMBars.Utils.extend(ret, common);
          DOMBars.Utils.extend(ret, param);
        }

        return ret;
      },
      noop:             DOMBars.VM.noop,
      compilerInfo:     null,
      subscriptions:    [],
      programWithDepth: DOMBars.VM.programWithDepth,
      get: function (parent, name) {
        // Push every request into the subscriptions array automatically.
        container.subscriptions.push([parent, name]);

        return DOMBars.get(parent, name);
      },
      subscribe: function (fn, singleton) {
        if (!container.subscriptions.length) {
          return false;
        }

        var triggered = false;
        var subscription, parent, name;

        var blocker = function (fn) {
          return function () {
            if (triggered) { return; }

            triggered = true;
            DOMBars.Utils.requestAnimationFrame(function () {
              fn();
              triggered = false;
            });
          };
        };

        // Handle singletons differently since we should only have the one
        if (singleton) {
          subscription = container.subscriptions.pop();
          parent       = subscription[0];
          name         = subscription[1];

          return DOMBars.subscribe(parent, name, blocker(function () {
            fn(DOMBars.get(parent, name));
          }));
        }

        var subscriber = blocker(fn);

        while (container.subscriptions.length) {
          subscription = container.subscriptions.pop();
          parent       = subscription[0];
          name         = subscription[1];

          DOMBars.subscribe(parent, name, subscriber);
        }
      }
    });

    /**
     * Return the compiled JavaScript function for execution.
     *
     * @param  {Object} context
     * @param  {Object} options
     * @return {Node}
     */
    return function (context, options) {
      options = options || {};

      var result = templateSpec.call(
        container,
        DOMBars,
        context,
        options.helpers,
        options.partials,
        options.data
      );

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
        }

        throw new Error('Template was precompiled with a newer version of' +
          'DOMBars than the current runtime. Please update your runtime to ' +
          'a newer version (' + compilerInfo[1] + ').');
      }

      return result;
    };
  };

  return DOMBars;
};
