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
    var Utils   = DOMBars.Utils;

    /**
     * The container object holds all the functions used by the template spec.
     *
     * @type {Object}
     */
    var container = {
      invokePartial:    DOMBars.VM.invokePartial,
      programs:         [],
      noop:             DOMBars.VM.noop,
      compilerInfo:     null,
      appendChild:      DOMBars.Utils.appendChild,
      escapeExpression: DOMBars.Utils.escapeExpression,
      programWithDepth: DOMBars.VM.programWithDepth
    };

    var subscribe = function (fn) {
      var subscriptions = [];

      var each = function (fn) {
        for (var i = 0; i < subscriptions.length; i++) {
          var subscription = subscriptions[i];
          fn(subscription[0], subscription[1]);
        }
      };

      var update = function () {
        subscription.unsubscribe();

        Utils.requestAnimationFrame(function () {
          subscription.subscribe(subscription());
        });
      };

      var subscription = function () {
        // Alias current current subscriptions for `get` functionality.
        container.subscriptions = subscriptions;

        var result = fn();

        each(function (obj, property) {
          DOMBars.subscribe(obj, property, update);
        });

        return result;
      };

      subscription.unsubscribe = function () {
        each(function (obj, property) {
          DOMBars.unsubscribe(obj, property, update);
        });

        subscriptions = [];
      };

      subscription.subscribe = function () {};

      return subscription;
    };

    container.createElement = function (fn, cb) {
      var subscription = subscribe(fn);
      var el           = Utils.createElement(subscription());

      subscription.subscribe = function (value) {
        cb(Utils.copyAndReplaceNode(Utils.createElement(value), el));
      };

      return el;
    };

    container.setAttribute = function (elementFn, nameFn, valueFn) {
      var nameSubscription  = subscribe(nameFn);
      var valueSubscription = subscribe(valueFn);

      // Keep track of the current name and value without having to re-run the
      // function every time something changes.
      var attrName  = nameSubscription();
      var attrValue = valueSubscription();

      nameSubscription.subscribe = function (value) {
        Utils.removeAttribute(elementFn(), attrName);
        Utils.setAttribute(elementFn(), attrName = value, attrValue);
      };

      valueSubscription.subscribe = function (value) {
        Utils.setAttribute(elementFn(), attrName, attrValue = value);
      };

      return Utils.setAttribute(elementFn(), attrName, attrValue);
    };

    container.createDOM = function (fn) {
      var subscription = subscribe(fn);
      var el           = Utils.domifyExpression(subscription());

      subscription.subscribe = function (value) {
        el = Utils.replaceNode(Utils.domifyExpression(value), el);
      };

      return el;
    };

    container.createText = function (fn) {
      var subscription = subscribe(fn);
      var el           = Utils.textifyExpression(subscription());

      subscription.subscribe = function (value) {
        el = Utils.replaceNode(Utils.textifyExpression(value), el);
      };

      return el;
    };

    container.createComment = function (fn) {
      var subscription = subscribe(fn);
      var el           = Utils.createComment(subscription());

      subscription.subscribe = function (value) {
        el = Utils.replaceNode(Utils.createComment(value), el);
      };

      return el;
    };

    container.program = function (i, fn, data) {
      var programWrapper = this.programs[i];

      if (data) {
        return DOMBars.VM.program(i, fn, data);
      }

      if (!programWrapper) {
        return this.programs[i] = DOMBars.VM.program(i, fn);
      }

      return programWrapper;
    };

    container.merge = function (param, common) {
      var ret = param || common;

      if (param && common) {
        ret = {};
        DOMBars.Utils.extend(ret, common);
        DOMBars.Utils.extend(ret, param);
      }

      return ret;
    };

    container.get = function (parent, property) {
      container.subscriptions.push([parent, property]);

      return DOMBars.get(parent, property);
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

  return DOMBars;
};
