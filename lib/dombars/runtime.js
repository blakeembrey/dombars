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
      get: function (parent, name, type) {
        // Push every request into the subscriptions array automatically.
        container.subscriptions.push([parent, name, type]);

        return get(parent, name, type);
      },
      subscribe: function (fn) {
        var subscriptions = container.subscriptions;
        container.subscriptions = [];

        /* jshint -W083 */
        for (var i = 0; i < subscriptions.length; i++) {
          var parent = subscriptions[i][0];
          var name   = subscriptions[i][1];
          var type   = subscriptions[i][2];

          if (type === 'context') {
            return DOMBars.subscribe(parent, name, function () {
              DOMBars.Utils.requestAnimationFrame(function () {
                fn(get(parent, name, type));
              });
            });
          }
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
