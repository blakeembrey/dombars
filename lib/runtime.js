var runtime = require('handlebars/lib/handlebars/runtime');
var raf     = process.browser && require('raf-component');

/**
 * Attribute runtime features to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function(DOMBars) {
  runtime.attach(DOMBars);

  /**
   * Bind a function to the animation frame.
   *
   * @param  {Function} fn
   * @return {Number}
   */
  DOMBars.VM.exec = function (fn) {
    return process.browser ? raf(fn) : process.nextTick(fn);
  };

  /**
   * Accepts a function that has subscriptions called inside and returns a new
   * function that will listen to all subscriptions and can update with any
   * changes.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  DOMBars.VM.subscribe = function (fn) {
    /**
     * The returned subscription function takes care of aliasing the
     * subscriptions array correctly, subscribing for updates and triggering
     * updates when any of the subscriptions change.
     *
     * @return {*}
     */
    var subscriber = function () {
      // If we have a parent subscriber, link the subscribers together.
      if (DOMBars.VM.subscriber) {
        subscriber.parent = DOMBars.VM.subscriber;
        DOMBars.VM.subscriber.children[subscriber.cid] = subscriber;
      }

      // Alias subscriber functionality to the VM object.
      DOMBars.VM.subscriber  = subscriber;
      DOMBars.VM.unsubscribe = function (fn) {
        subscriber.unsubscriptions.push(fn);
      };

      var result = fn.apply(this, arguments);

      // Reset the VM functionality to what it was beforehand.
      DOMBars.VM.subscriber  = subscriber.parent;
      DOMBars.VM.unsubscribe = null;

      // Iterate over all the automatically added subscriptions and subscribe
      // using the built in subscription method.
      for (var i = 0; i < subscriber.subscriptions.length; i++) {
        var subscription = subscriber.subscriptions[i];
        DOMBars.subscribe(subscription[0], subscription[1], change);
      }

      return result;
    };

    // Keep an array of current subscriptions and an object with references
    // to child subscription functions.
    subscriber.cid             = 'subscriber' + DOMBars.Utils.uniqueId();
    subscriber.children        = {};
    subscriber.subscriptions   = [];
    subscriber.unsubscriptions = [];

    /**
     * Trigger this function with every change with the listeners.
     */
    var change = function () {
      subscriber.unsubscribe();

      DOMBars.VM.exec(function () {
        subscriber.update && subscriber.update(subscriber());
      });
    };

    /**
     * Remove the current subscriber from all listeners.
     */
    subscriber.unsubscribe = function () {
      // Remove all the automatic subscriptions from the view.
      while (subscriber.subscriptions.length) {
        var subscription = subscriber.subscriptions.pop();
        DOMBars.unsubscribe(subscription[0], subscription[1], change);
      }

      // Remove all manual unsubscribe functions.
      while (subscriber.unsubscriptions.length) {
        subscriber.unsubscriptions.pop()();
      }

      // Iterate through the registered children and remove their listeners.
      for (var child in subscriber.children) {
        subscriber.children[child].unsubscribe();
      }

      // Remove any references from the parent subscriber.
      if (subscriber.parent) {
        delete subscriber.parent.children[subscriber.cid];
        delete subscriber.parent;
      }
    };

    return subscriber;
};

  /**
   * Render and subscribe a single DOM node using a custom creation function.
   *
   * @param  {Function} fn
   * @param  {Function} create
   * @return {Node}
   */
  var subscribeNode = function (fn, create) {
    var subscription = DOMBars.VM.subscribe(fn);
    var node         = create(subscription());

    subscription.update = function (value) {
      node = DOMBars.Utils.replaceNode(create(value), node);
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
  DOMBars.VM.createElement = function (fn, cb) {
    var subscription = DOMBars.VM.subscribe(fn);
    var el           = DOMBars.Utils.createElement(subscription());

    subscription.update = function (value) {
      cb(el = DOMBars.Utils.copyAndReplaceNode(
          DOMBars.Utils.createElement(value), el
      ));
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
  DOMBars.VM.setAttribute = function (elementFn, nameFn, valueFn) {
    var nameSubscription  = DOMBars.VM.subscribe(nameFn);
    var valueSubscription = DOMBars.VM.subscribe(valueFn);

    // Keep track of the current name and value without having to re-run the
    // function every time something changes.
    var attrName  = nameSubscription();
    var attrValue = valueSubscription();

    nameSubscription.update = function (value) {
      DOMBars.Utils.removeAttribute(elementFn(), attrName);
      DOMBars.Utils.setAttribute(elementFn(), attrName = value, attrValue);
    };

    valueSubscription.update = function (value) {
      DOMBars.Utils.setAttribute(elementFn(), attrName, attrValue = value);
    };

    return DOMBars.Utils.setAttribute(elementFn(), attrName, attrValue);
  };

  /**
   * Create a DOM element and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Node}
   */
  DOMBars.VM.createDOM = function (fn) {
    return subscribeNode(fn, DOMBars.Utils.domifyExpression);
  };

  /**
   * Create a text node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Text}
   */
  DOMBars.VM.createText = function (fn) {
    return subscribeNode(fn, DOMBars.Utils.textifyExpression);
  };

  /**
   * Create a comment node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Comment}
   */
  DOMBars.VM.createComment = function (fn) {
    return subscribeNode(fn, DOMBars.Utils.createComment);
  };

  /**
   * Generate an executable template from a template spec.
   *
   * @param  {Object}   templateSpec
   * @return {Function}
   */
  DOMBars.VM.template = DOMBars.template = function (templateSpec) {
    var DOMBars    = this;
    var subscriber = DOMBars.VM.subscribe(templateSpec);

    /**
     * The container object holds all the functions used by the template spec.
     *
     * @type {Object}
     */
    var container = {
      invokePartial:    DOMBars.VM.invokePartial,
      programs:         [],
      noop:             DOMBars.VM.noop,
      subscriber:       subscriber,
      compilerInfo:     null,
      appendChild:      DOMBars.Utils.appendChild,
      createDOM:        DOMBars.VM.createDOM,
      createText:       DOMBars.VM.createText,
      setAttribute:     DOMBars.VM.setAttribute,
      createComment:    DOMBars.VM.createComment,
      createElement:    DOMBars.VM.createElement,
      escapeExpression: DOMBars.Utils.escapeExpression,
      programWithDepth: DOMBars.VM.programWithDepth
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
      DOMBars.VM.subscriber.subscriptions.push([object, property]);

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

      var result = subscriber.call(
        container,
        DOMBars,
        context,
        options.helpers,
        options.partials,
        options.data
      );

      // Attach an `unsubscribe` function to the resulting DOM.
      // TODO: Come up with an improved solution.
      result.unsubscribe = subscriber.unsubscribe;

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
            'runtime to an older version (' + compilerVersions + ')');
        }

        throw new Error('Template was precompiled with a newer version of' +
          'DOMBars than the current runtime. Please update your runtime to ' +
          'a newer version (' + compilerInfo[1] + ')');
      }

      return result;
    };
  };

  return DOMBars;
};
