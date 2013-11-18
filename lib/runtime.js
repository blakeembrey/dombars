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

    /**
     * Accepts a function that has subscriptions called inside and returns a new
     * function that will listen to all subscriptions and can update with any
     * changes.
     *
     * @param  {Function} fn
     * @return {Function}
     */
    var subscribe = function (fn) {
      var subscriptions = [];

      /**
       * Iterate over each subscription and run the callback function.
       *
       * @param {Function} fn
       */
      var each = function (fn) {
        for (var i = 0; i < subscriptions.length; i++) {
          var subscription = subscriptions[i];
          fn(subscription[0], subscription[1]);
        }
      };

      /**
       * Trigger the update function callback used for *every* subscription.
       */
      var update = function () {
        subscription.unsubscribe();

        Utils.requestAnimationFrame(function () {
          subscription.subscribe(subscription());
        });
      };

      /**
       * The returned subscription function takes care of aliases the
       * subscriptions array correctly, subscribing for updates and triggering
       * subscribe when any of the subscriptions change.
       *
       * @return {*}
       */
      var subscription = function () {
        // Alias current current subscriptions for `get` functionality.
        container.subscriptions = subscriptions;

        var result = fn();

        each(function (obj, property) {
          DOMBars.subscribe(obj, property, update);
        });

        return result;
      };

      /**
       * The unsubscribe function is a small helper for removing all listeners.
       */
      subscription.unsubscribe = function () {
        each(function (obj, property) {
          DOMBars.unsubscribe(obj, property, update);
        });

        subscriptions = [];
      };

      /**
       * Set your own subscription function to run when something changes. By
       * default its a noop.
       */
      subscription.subscribe = function () {};

      return subscription;
    };

    /**
     * Render and subscribe a single DOM node using a custom creation function.
     *
     * @param  {Function} fn
     * @param  {Function} create
     * @return {Node}
     */
    var subscribeNode = function (fn, create) {
      var subscription = subscribe(fn);
      var node         = create(subscription());

      subscription.subscribe = function (value) {
        node = Utils.replaceNode(create(value), node);
      };

      return node;
    };

    /**
     * Create an element and subscribe to any changes. This method requires a
     * callback function for any element changes since you can't change a tag
     * name in place.
     *
     * @param  {Function} fn
     * @param  {Function} cb
     * @return {Element}
     */
    container.createElement = function (fn, cb) {
      var subscription = subscribe(fn);
      var el           = Utils.createElement(subscription());

      subscription.subscribe = function (value) {
        cb(Utils.copyAndReplaceNode(Utils.createElement(value), el));
      };

      return el;
    };

    /**
     * Set an elements attribute. We accept the current element a function
     * because when a tag name changes we will lose reference to the actively
     * rendered element.
     *
     * @param {Function} elementFn
     * @param {Function} nameFn
     * @param {Function} valueFn
     */
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

    /**
     * Create a DOM element and subscribe to any changes.
     *
     * @param  {Function} fn
     * @return {Node}
     */
    container.createDOM = function (fn) {
      return subscribeNode(fn, Utils.domifyExpression);
    };

    /**
     * Create a text node and subscribe to any changes.
     *
     * @param  {Function} fn
     * @return {Text}
     */
    container.createText = function (fn) {
      return subscribeNode(fn, Utils.textifyExpression);
    };

    /**
     * Create a comment node and subscribe to any changes.
     *
     * @param  {Function} fn
     * @return {Comment}
     */
    container.createComment = function (fn) {
      return subscribeNode(fn, Utils.createComment);
    };

    /**
     * Create and return a program singleton based on index.
     *
     * @param  {Number}   i
     * @param  {Function} fn
     * @param  {Object}   data
     * @return {Function}
     */
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

    /**
     * Merge two objects into a single object.
     *
     * @param  {Object} param
     * @param  {Object} common
     * @return {Object}
     */
    container.merge = function (param, common) {
      var ret = param || common;

      if (param && common) {
        ret = {};
        DOMBars.Utils.extend(ret, common);
        DOMBars.Utils.extend(ret, param);
      }

      return ret;
    };

    /**
     * Get a property from an object.
     *
     * @param  {Object} object
     * @param  {String} property
     * @return {*}
     */
    container.get = function (object, property) {
      container.subscriptions.push([object, property]);

      return DOMBars.get(object, property);
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
