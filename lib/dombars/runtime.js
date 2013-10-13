var runtime = require('handlebars/lib/handlebars/runtime');


exports.attach = function(DOMBars) {
  runtime.attach(DOMBars);

  /**
   * Get a specific value using DOMBars based on different types.
   *
   * @param  {Object} parent
   * @param  {String} name
   * @param  {String} type
   * @return {*}
   */
  var get = function (parent, name, type) {
    if (type === 'context') {
      return DOMBars.get(parent, name);
    }

    return parent[name];
  };

  /**
   * Generate an executable template from a template spec.
   *
   * @param  {Object}   templateSpec
   * @return {Function}
   */
  DOMBars.VM.template = DOMBars.template = function (templateSpec) {
    /**
     * Alias the current `this` context, which is allows for greater modularity.
     *
     * @type {DOMBars}
     */
    var DOMBars = this;

    /**
     * The container object holds all the functions used by the template spec.
     *
     * @type {Object}
     */
    var container = {
      isElement: DOMBars.Utils.isElement,
      domifyExpression: DOMBars.Utils.domifyExpression,
      textifyExpression: DOMBars.Utils.textifyExpression,
      invokePartial: DOMBars.VM.invokePartial,
      escapeExpression: DOMBars.Utils.escapeExpression,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];

        if (data) {
          return DOMBars.VM.program(i, fn, data);
        }

        if (!programWrapper) {
          return this.programs[i] = DOMBars.VM.program(i, fn);
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
      compilerInfo: null,
      subscriptions: [],
      get: function (parent, name, type) {
        // Set the active subscription context.
        this.subscription = [parent, name, type];

        return get(parent, name, type);
      },
      subscribe: function (fn) {
        var parent = this.subscription[0];
        var name   = this.subscription[1];
        var type   = this.subscription[2];

        var subscription = function () {
          return fn(get(parent, name, type));
        };

        if (type === 'context') {
          // Push the current subscription into the subscriptions array.
          this.subscriptions.push([parent, name, subscription]);

          return DOMBars.subscribe(parent, name, subscription);
        }
      }
    };

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
};
