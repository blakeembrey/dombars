var hbsVM     = require('handlebars/dist/cjs/handlebars/runtime');
var Utils     = require('./utils');
var isBrowser = typeof window !== 'undefined';
var raf       = isBrowser && require('./raf');

/**
 * Iterate over an array of functions and execute each of them.
 *
 * @param {Array} array
 */
var iteration = function (array) {
  for (var i = 0; i < array.length; i++) {
    array[i]();
  }
};

/**
 * Extend the Handlebars runtime environment with DOM specific helpers.
 *
 * @type {Object}
 */
var VM = module.exports = Utils.create(hbsVM);

/**
 * Bind a function to the animation frame.
 *
 * @param  {Function} fn
 * @return {Number}
 */
VM.exec = function (fn) {
  return isBrowser ? raf(fn) : setImmediate(fn);
};

/**
 * Cancel an execution.
 *
 * @param {Number} id
 */
VM.exec.cancel = function (id) {
  return isBrowser ? raf.cancel(id) : clearImmediate(id);
};

/**
 * Generate an executable template from a template spec.
 *
 * @param  {Object}   templateSpec
 * @return {Function}
 */
VM.template = function (templateSpec, env) {
  /**
   * Accepts a function that has subscriptions called inside and returns a new
   * function that will listen to all subscriptions and can update with any
   * changes.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  var subscribe = function (fn) {
    var triggered    = false;
    var unsubscribed = false;
    var execId;
    var updater;
    var prevSubscriptions;

    /**
     * Iterate over a subscriptions object and unsubscribe everything.
     *
     * @param {Array} subscriptions
     */
    var eachSubscription = function (subscriptions, fn) {
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          var subscription = subscriptions[property][key];
          fn(subscription, property, subscriber.update);
        }
      }
    };

    /**
     * Run this function before we run an update function. It moves current
     * subscriptions so that we can diff the subscriptions after we update
     * the DOM.
     */
    var beforeUpdate = function () {
      iteration(subscriber.unsubscriptions);
      prevSubscriptions = subscriber.subscriptions;
    };

    /**
     * Run this function after an update. It will check for difference in the
     * before and after updates.
     */
    var afterUpdate = function () {
      var subscriptions = subscriber.subscriptions;

      // Diff the new subscriptions against the previous subscriptions object
      // to add/remove listeners as needed. This is more memory efficient than
      // blindly adding and removing every listener each execution.
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          if (!prevSubscriptions[property][key]) {
            var subscription = subscriptions[property][key];
            env.subscribe(subscription, property, subscriber.update);
          } else {
            delete prevSubscriptions[property][key];
          }
        }
      }

      // Loop over previous subscriptions that no longer exist and unsubscribe.
      eachSubscription(prevSubscriptions, env.unsubscribe);

      // Remove any lingering references to previous subscription objects.
      prevSubscriptions = null;
    };

    /**
     * Unsubscribe every child of the current subscription.
     */
    var unsubscribeChildren = function () {
      for (var child in subscriber.children) {
        subscriber.children[child].remove();
      }
    };

    /**
     * Execute the function and return the result.
     *
     * @return {*}
     */
    var execute = function () {
      // If we have a parent subscriber, link the subscribers together.
      if (container.subscriber) {
        subscriber.parent = container.subscriber;
        subscriber.parent.children[subscriber.cid] = subscriber;
      }

      // Reset subscriptions before execution.
      subscriber.subscriptions   = {};
      subscriber.unsubscriptions = [];

      // Alias subscriber functionality to the VM object.
      container.subscriber = subscriber;

      var value = fn.apply(this, arguments);

      // Reset the VM functionality to what it was beforehand.
      container.subscriber = subscriber.parent;

      // Return an object with a value property and unsubscribe functionality.
      return value;
    };

    /**
     * The returned subscription function takes care of aliasing the
     * subscriptions array correctly, subscribing for updates and triggering
     * updates when any of the subscriptions change.
     *
     * @param  {Function} fn
     * @return {*}
     */
    var subscriber = function (fn) {
      var result = execute.apply(this, arguments);

      updater = fn;
      eachSubscription(subscriber.subscriptions, env.subscribe);

      return result;
    };

    // Keep an array of current subscriptions and an object with references
    // to child subscription functions.
    subscriber.cid      = 'subscriber' + Utils.uniqueId();
    subscriber.children = {};

    /**
     * Trigger this function with every change with the listeners.
     */
    subscriber.update = function () {
      // If the triggered flag has been set, don't cause another update.
      if (triggered || unsubscribed) { return; }

      // Set a triggered flag to avoid multiple triggers. Also unsubscribe any
      // children immediately to stop update clashes.
      triggered = true;
      unsubscribeChildren();

      execId = VM.exec(function () {
        triggered = false;

        beforeUpdate();
        updater(execute());
        afterUpdate();
      });
    };

    /**
     * Push unsubscription functions into the unsubscribe array.
     */
    subscriber.unsubscribe = function (fn) {
      Utils.isFunction(fn) && subscriber.unsubscriptions.push(fn);
    };

    /**
     * Remove the current subscriber from all listeners. We also need to cancel
     * any current execution event and remove a reference from the parent
     * subscription.
     */
    subscriber.remove = function () {
      iteration(subscriber.unsubscriptions);
      eachSubscription(subscriber.subscriptions, env.unsubscribe);

      // Remove the current subscription from its parent.
      if (subscriber.parent) {
        delete subscriber.parent.children[subscriber.cid];
        delete subscriber.parent;
      }

      // Remove other refernences.
      updater = null;

      // Track whether we have been unsubscribed. This is required since the
      // listener could still be triggered at any time even though we expect
      // the external references to be dropped. This could also indicate a
      // potential memory leak with the listener unsusbcription code.
      unsubscribed = true;
      unsubscribeChildren();
      VM.exec.cancel(execId);
    };

    return subscriber;
  };

  /**
   * Wrap a function in a subscriber *every* time that function is called.
   *
   * @param  {Function} fn
   * @return {Object}
   */
  var wrapSubscriber = function (fn) {
    return function () {
      var subscriber = subscribe(fn);
      var value      = subscriber.apply(this, arguments);

      // Return an object wrapped in useful functionality.
      return {
        value:       value,
        unsubscribe: subscriber.remove
      };
    };
  };

  /**
   * The container object holds all the functions used by the template spec.
   *
   * @type {Object}
   */
  var container = {
    invokePartial:    VM.invokePartial,
    programs:         [],
    noop:             VM.noop,
    partial:          Utils.partial,
    escapeExpression: Utils.escapeExpression,
    programWithDepth: VM.programWithDepth
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

    var trackNode = Utils.trackNode(create(subscription(function (value) {
      trackNode.replace(create(value));
    })));

    return trackNode.fragment;
  };

  /**
   * Remove an attribute from an element.
   *
   * @param {Node}   element
   * @param {String} name
   */
  var removeAttribute = function (element, name) {
    if (element.hasAttribute(name)) {
      env.emit('removeAttribute', element, name);
      element.removeAttribute(name);
    }
  };

  /**
   * Set an attribute value on an element.
   *
   * @param {Node}   element
   * @param {String} name
   * @param {*}      value
   */
  var setAttribute = function (element, name, value) {
    if (value === false) {
      return removeAttribute(element, name);
    }

    env.emit('setAttribute', element, name, value);
    element.setAttribute(name, value);
  };

  /**
   * Create an element from a tag name.
   *
   * @param  {String} tagName
   * @return {Node}
   */
  var createElement = function (tagName) {
    var node = document.createElement(tagName);
    env.emit('createElement', node);
    return node;
  };

  /**
   * Create a comment node based on text contents.
   *
   * @param  {String} contents
   * @return {Node}
   */
  var createComment = function (tagName) {
    var node = document.createComment(tagName);
    env.emit('createComment', node);
    return node;
  };

  /**
   * Copy all significant data from one element node to another.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  var copyNode = function (newNode, oldNode) {
    // Move all child elements to the new node.
    while (oldNode.firstChild) {
      newNode.appendChild(oldNode.firstChild);
    }

    // Copy all the attributes to the new node.
    for (var i = 0; i < oldNode.attributes.length; i++) {
      var attribute = oldNode.attributes[i];
      setAttribute(newNode, attribute.name, attribute.value);
    }

    return newNode;
  };

  /**
   * Copy all the data from one element to another and replace in place.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  var copyAndReplaceNode = function (newNode, oldNode) {
    oldNode.parentNode.replaceChild(copyNode(newNode, oldNode), oldNode);
    return newNode;
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

    var el = createElement(subscription(function (value) {
      cb(el = copyAndReplaceNode(createElement(value), el));
    }));

    return el;
  };

  /**
   * Append an element to the end of another element.
   *
   * @param {Node} parent
   * @param {Node} child
   */
  container.appendChild = function (parent, child) {
    if (!child) { return; }

    parent.appendChild(child);
    env.emit('appendChild', parent, child);
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
    var attrName = nameSubscription(function (value) {
      removeAttribute(elementFn(), attrName);
      setAttribute(elementFn(), attrName = value, attrValue);
    });

    var attrValue = valueSubscription(function (value) {
      setAttribute(elementFn(), attrName, attrValue = value);
    });

    return setAttribute(elementFn(), attrName, attrValue);
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
    var subscription = subscribe(fn);
    var node         = createComment(subscription(function (value) {
      node.textContent = value;
    }));

    return node;
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
    var programWrapper = container.programs[i];

    if (data) {
      return VM.program(i, fn, data);
    }

    if (!programWrapper) {
      return container.programs[i] = VM.program(i, fn);
    }

    return programWrapper;
  };

  /**
   * Wrap program functions with subscriber functionality.
   *
   * @param  {Function} program
   * @return {Function}
   */
  container.wrapProgram = function (fn) {
    return function () {
      return wrapSubscriber(fn).apply(this, arguments);
    };
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

    if (param && common && (param !== common)) {
      ret = {};
      Utils.extend(ret, common);
      Utils.extend(ret, param);
    }

    return ret;
  };

  /**
   * Get a property from an object. Passes in the object id (depth) to make it
   * much faster to do comparisons between new and old subscriptions.
   *
   * @param  {Object} object
   * @param  {String} property
   * @param  {String} id
   * @return {*}
   */
  container.get = function (object, property, id) {
    var subscriptions = container.subscriber.subscriptions;

    (subscriptions[property] || (subscriptions[property] = {}))[id] = object;

    return env.get(object, property);
  };

  /**
   * Return the compiled JavaScript function for execution.
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  return wrapSubscriber(function (context, options) {
    options = options || {};

    var namespace = options.partial ? options : env;
    var helpers;
    var partials;

    if (!options.partial) {
      helpers  = options.helpers;
      partials = options.partials;
    }

    var result = templateSpec.call(
      container,
      namespace,
      context,
      helpers,
      partials,
      options.data
    );

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  });
};
