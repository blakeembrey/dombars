var hbsVM     = require('handlebars/dist/cjs/handlebars/runtime');
var Utils     = require('./utils');
var isBrowser = typeof window !== 'undefined';
var raf       = isBrowser && require('./raf');


/**
 * Iterate over a subscriptions object, calling a function with the object
 * property details and a unique callback function.
 *
 * @param {Array}    subscriptions
 * @param {Function} fn
 * @param {Function} callback
 */
var iterateSubscriptions = function (subscriptions, fn, callback) {
  for (var property in subscriptions) {
    for (var key in subscriptions[property]) {
      var subscription = subscriptions[property][key];
      fn(subscription, property, callback);
    }
  }
};

/**
 * Iterate over an unsubscriptions array calling each function and removing
 * them from the array.
 *
 * @param {Array} unsubscriptions
 */
var iterateUnsubscriptions = function (unsubscriptions) {
  while (unsubscriptions.length) {
    unsubscriptions.pop()();
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

  var subscription = function (fn, update) {
    var subscription = {};

    subscription.cid             = 'subscription' + Utils.uniqueId();
    subscription.children        = {};
    subscription.subscriptions   = {};
    subscription.unsubscriptions = [];

    subscription.subscribe = function (object, property, id) {
      var subscriptions = subscription.subscriptions;
      (subscriptions[property] || (subscriptions[property] = {}))[id] = object;
    };

    subscription.unsubscription = function (fn) {
      Utils.isFunction(fn) && subscription.unsubscriptions.push(fn);
    };

    subscription.unsubscribe = function () {
      iterateUnsubscriptions(subscription.unsubscriptions);
      iterateSubscriptions(
        subscription.subscriptions, env.unsubscribe, subscription.update
      );

      if (subscription.parent) {
        delete subscription.parent.children[subscription.cid];
        delete subscription.parent;
      }

      VM.exec.cancel(subscription._execId);
      subscription._unsubscribed = true;
      subscription._unsubscribeChildren();
    };

    subscription._unsubscribeChildren = function () {
      for (var child in subscription.children) {
        subscription.children[child].unsubscribe();
      }
    };

    subscription.execute = Utils.wrap(function () {
      // If we have an existing subscription, link the subscriptions together.
      if (container.subscription) {
        subscription.parent = container.subscription;
        subscription.parent.children[subscription.cid] = subscription;
      }

      container.subscription = subscription;

      iterateUnsubscriptions(subscription.unsubscriptions);
      subscription._subscriptions = subscription.subscriptions;
      subscription.subscriptions  = {};
    }, fn, function () {
      container.subscription = subscription.parent;

      var current  = subscription.subscriptions;
      var previous = subscription._subscriptions;

      for (var property in current) {
        for (var key in current[property]) {
          if (previous[property] && previous[property][key]) {
            delete subscription._subscriptions[property][key];
          } else {
            env.subscribe(
              current[property][key], property, subscription.update
            );
          }
        }
      }

      iterateSubscriptions(
        subscription._subscriptions, env.unsubscribe, subscription.update
      );

      delete subscription._subscriptions;
    });

    subscription.update = function () {
      if (subscription._triggered || subscription._unsubscribed) {
        return false;
      }

      subscription._triggered = true;
      subscription._unsubscribeChildren();

      subscription._execId = VM.exec(function () {
        update.call(subscription, subscription.execute());
      });

      return true;
    };

    return subscription;
  };

  var subscribe = function (fn, create, update) {
    var subscriber = subscription(fn, update);

    subscriber.value = subscriber.execute();

    if (create) {
      subscriber.value = create(subscriber.value);
    }

    return subscriber;
  };

  /**
   * Wrap a function in a subscriber *every* time that function is called.
   *
   * @param  {Function} fn
   * @return {Object}
   */
  var wrapProgram = function (fn) {
    return function () {
      var subscriber = subscription(fn);

      return {
        value:       subscriber.execute.apply(this, arguments),
        unsubscribe: subscriber.unsubscribe
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
    wrapProgram:      wrapProgram,
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
    return subscribe(
      fn,
      Utils.sequence(create, Utils.trackNode),
      function (value) {
        this.value.replace(create(value));
      }
    ).value.fragment;
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
    return subscribe(
      fn,
      createElement,
      function (el) {
        cb(this.value = copyAndReplaceNode(createElement(el), this.value));
      }
    ).value;
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
   * @param {Function} currentEl
   * @param {Function} nameFn
   * @param {Function} valueFn
   */
  container.setAttribute = function (currentEl, nameFn, valueFn) {
    var attrName = subscribe(nameFn, null, function (value) {
      removeAttribute(currentEl(), this.value);
      setAttribute(currentEl(), this.value = value, attrValue.value);
    });

    var attrValue = subscribe(valueFn, null, function (value) {
      setAttribute(currentEl(), attrName.value, this.value = value);
    });

    return setAttribute(currentEl(), attrName.value, attrValue.value);
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
    return subscribe(fn, createComment, function (value) {
      this.value.textContent = value;
    }).value;
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
    container.subscription.subscribe(object, property, id);
    return env.get(object, property);
  };

  /**
   * Return the compiled JavaScript function for execution.
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  return wrapProgram(function (context, options) {
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
