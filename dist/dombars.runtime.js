!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.DOMBars=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var base       = _dereq_('./lib/base');
var SafeString = _dereq_('./lib/safe-string');
var Exception  = _dereq_('./lib/exception');
var Utils      = _dereq_('./lib/utils');
var runtime    = _dereq_('./lib/runtime');

module.exports = (function create () {
  var db = new base.DOMBarsEnvironment();

  Utils.extend(db, base);
  db.VM         = runtime;
  db.Utils      = Utils;
  db.create     = create;
  db.Exception  = Exception;
  db.SafeString = SafeString;

  db.template = function (spec) {
    return runtime.template(spec, db);
  };

  return db;
})();

},{"./lib/base":2,"./lib/exception":3,"./lib/runtime":5,"./lib/safe-string":6,"./lib/utils":8}],2:[function(_dereq_,module,exports){
var hbsBase               = _dereq_('handlebars/dist/cjs/handlebars/base');
var Utils                 = _dereq_('./utils');
var HandlebarsEnvironment = hbsBase.HandlebarsEnvironment;

/**
 * Extend Handlebars base object with custom functionality.
 *
 * @type {Object}
 */
var base = module.exports = Utils.create(hbsBase);

/**
 * Register DOMBars helpers on the passed in DOMBars instance.
 *
 * @param {Object} instance
 */
var registerDefaultHelpers = function (instance) {
  /**
   * The handlebars `each` helper is incompatibable with DOMBars, since it
   * assumes string concatination (as opposed to document fragments).
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  instance.registerHelper('each', function (context, options) {
    var fn       = options.fn;
    var inverse  = options.inverse;
    var fragment = document.createDocumentFragment();
    var i        = 0;
    var data;

    if (typeof context === 'function') {
      context = context.call(this);
    }

    if (options.data) {
      data = Utils.create(options.data);
    }

    if (typeof context === 'object') {
      var len = context.length;

      if (len === +len) {
        for (; i < len; i++) {
          data.index = i;
          data.first = (i === 0);
          data.last  = (i === len - 1);

          fragment.appendChild(fn(context[i], { data: data }));
        }
      } else {
        for (var key in context) {
          if (Object.prototype.hasOwnProperty.call(context, key)) {
            i += 1;

            data.key   = key;
            data.index = i;
            data.first = (i === 0);

            fragment.appendChild(fn(context[key], { data: data }));
          }
        }
      }
    }

    if (i === 0) {
      return inverse(this);
    }

    return fragment;
  });
};

/**
 * Create a custom DOMBars environment to match HandlebarsEnvironment.
 */
var DOMBarsEnvironment = base.DOMBarsEnvironment = function () {
  HandlebarsEnvironment.apply(this, arguments);
  registerDefaultHelpers(this);
};

/**
 * Extend the HandlebarsEnvironment prototype.
 *
 * @type {Object}
 */
var envPrototype = DOMBarsEnvironment.prototype = Utils.create(
  HandlebarsEnvironment.prototype
);

/**
 * Alias some useful functionality that is expected to be exposed on the root
 * object.
 */
envPrototype.createFrame       = hbsBase.createFrame;
envPrototype.REVISION_CHANGES  = hbsBase.REVISION_CHANGES;
envPrototype.COMPILER_REVISION = hbsBase.COMPILER_REVISION;

/**
 * The basic getter function. Override this with something else based on your
 * project. For example, Backbone.js models.
 *
 * @param  {Object} object
 * @param  {String} property
 * @return {*}
 */
envPrototype.get = function (object, property) {
  return object[property];
};

/**
 * Noop functions for subscribe and unsubscribe. Override with custom
 * functionality.
 */
envPrototype.subscribe = envPrototype.unsubscribe = function () {};

},{"./utils":8,"handlebars/dist/cjs/handlebars/base":9}],3:[function(_dereq_,module,exports){
module.exports = _dereq_('handlebars/dist/cjs/handlebars/exception')['default'];

},{"handlebars/dist/cjs/handlebars/exception":10}],4:[function(_dereq_,module,exports){
(function (global){
/**
 * Wrap in an anonymous function to alias timer utilities.
 */
(function (setTimeout, clearTimeout, Date) {
  /**
   * Fallback animation frame implementation.
   *
   * @return {Function}
   */
  var fallback = function () {
    /**
     * Return the current timestamp integer.
     */
    var now = Date.now || function () {
      return new Date().getTime();
    };

    // Keep track of the previous "animation frame" manually.
    var prev = now();

    return function (fn) {
      var curr = now();
      var ms   = Math.max(0, 16 - (curr - prev));
      var req  = setTimeout(fn, ms);

      prev = curr;

      return req;
    };
  };

  /**
   * Expose `requestAnimationFrame`.
   *
   * @type {Function}
   */
  exports = module.exports = global.requestAnimationFrame ||
    global.webkitRequestAnimationFrame ||
    global.mozRequestAnimationFrame ||
    global.msRequestAnimationFrame ||
    global.oRequestAnimationFrame ||
    fallback();

  /**
   * Cancel the animation frame.
   *
   * @type {Function}
   */
  var cancel = global.cancelAnimationFrame ||
    global.webkitCancelAnimationFrame ||
    global.mozCancelAnimationFrame ||
    global.msCancelAnimationFrame ||
    global.oCancelAnimationFrame ||
    clearTimeout;

  /**
   * Cancel an animation frame.
   *
   * @param {Number} id
   */
  exports.cancel = function (id) {
    cancel(id);
  };
})(setTimeout, clearTimeout, Date);

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(_dereq_,module,exports){
var hbsVM = _dereq_('handlebars/dist/cjs/handlebars/runtime');
var Utils = _dereq_('./utils');
var raf   = _dereq_('./raf');

/**
 * Keep a map of attributes that need to update the corresponding properties.
 *
 * @type {Object}
 */
var ATTRIBUTE_PROPS = {
  INPUT: {
    value:   'value',
    checked: 'checked'
  },
  OPTION: {
    selected: 'selected'
  }
};

/**
 * Iterate over a subscriptions object, calling a function with the object
 * property details and a unique callback function.
 *
 * @param {Array}    subscriptions
 * @param {Function} fn
 * @param {Function} callback
 */
var iterateSubscriptions = function (subscriptions, fn, context) {
  for (var id in subscriptions) {
    for (var property in subscriptions[id]) {
      fn.call(context, subscriptions[id][property], property, id);
    }
  }
};

/**
 * Create a new subsciption instance. This functionality is tightly coupled to
 * DOMBars program execution.
 *
 * @param {Function} fn
 * @param {Function} update
 * @param {Object}   container
 */
var Subscription = function (fn, update, container) {
  // Alias passed in variables for later access.
  this._fn        = fn;
  this._update    = update;
  this._container = container;

  // Assign every subscription instance a unique id. This helps with linking
  // between parent and child subscription instances.
  this.cid             = 'c' + Utils.uniqueId();
  this.children        = {};
  this.subscriptions   = {};
  this.unsubscriptions = [];

  // Create statically bound function instances for public consumption.
  this.boundUpdate         = Utils.bind(this.update, this);
  this.boundUnsubscription = Utils.bind(this.unsubscription, this);
};

/**
 * Expose the internal susbcribe functionality for the container.
 *
 * @param {Object} object
 * @param {String} property
 * @param {String} id
 */
Subscription.prototype.subscribe = function (object, property, id) {
  (this.subscriptions[id] || (this.subscriptions[id] = {}))[property] = object;
};

/**
 * Pass a custom unsubscription function that will execute when we unsubscribe.
 *
 * @param {Function} fn
 */
Subscription.prototype.unsubscription = function (fn) {
  Utils.isFunction(fn) && this.unsubscriptions.push(fn);
};

/**
 * Unsubscribe from a subcriptions object.
 *
 * @param {Object} subscriptions
 */
Subscription.prototype._unsubscribe = function (subscriptions) {
  iterateSubscriptions(subscriptions, function (object, property, id) {
    delete subscriptions[id][property];
    this._container._unsubscribe(object, property, this.boundUpdate);
  }, this);
};

/**
 * Iterate over an array of unsubscriptions.
 *
 * @param {Array} unsubscriptions
 */
Subscription.prototype._unsubscription = function (unsubscriptions) {
  for (var i = 0; i < unsubscriptions.length; i++) {
    unsubscriptions[i]();
  }
};

/**
 * Unsubscribe everything from the current instance.
 */
Subscription.prototype.unsubscribe = function () {
  if (this._unsubscribed) { return; }

  this._unsubscribe(this.subscriptions);
  this._unsubscription(this.unsubscriptions);

  // Delete any reference to this subscription from the parent.
  if (this.parent) {
    delete this.parent.children[this.cid];
    delete this.parent;
  }

  // Cancel any currently executing functions. We also need to set an
  // unsubscribed flag in case the function is still available somewhere and
  // called after unsubscription has occured.
  VM.exec.cancel(this._execId);
  this._unsubscribed = true;
  this._unsubscribeChildren();

  // Remove unwanted lingering references.
  delete this.children;
  delete this.subscriptions;
  delete this.unsubscriptions;
  delete this._fn;
  delete this._update;
  delete this._container;
  delete this.boundUpdate;
  delete this.boundUnsubscription;
};

/**
 * Unsubscribe the current instance children.
 */
Subscription.prototype._unsubscribeChildren = function () {
  for (var child in this.children) {
    this.children[child].unsubscribe();
  }
};

/**
 * Execute the subscription function.
 *
 * @return {*}
 */
Subscription.prototype.execute = function () {
  var parent = this._container.subscription;

  // If we have an existing subscription, link the subscriptions together.
  if (parent && !parent._unsubscribed) {
    this.parent = this._container.subscription;
    this.parent.children[this.cid] = this;
  }

  // Alias the current subscriptions object for diffing after execution.
  this._subscriptions = this.subscriptions;
  this._unsubscription(this.unsubscriptions);

  // Reset the subscriptions and unsubscriptions objects before execution.
  this.subscriptions   = {};
  this.unsubscriptions = [];

  this._container.subscription = this;
  var result = this._fn.apply(this._container, arguments);
  this._container.subscription = this.parent;

  // The current subscriptions object needs to be compared against the previous
  // subscriptions and any diffences fixed.
  var current  = this.subscriptions;
  var previous = this._subscriptions;

  // Iterate over the new subscriptions object. Check every key in the object
  // against the previous subscriptions. If it exists in the previous object,
  // it means we are already subscribed. Otherwise we need to subscribe to
  // the new property.
  iterateSubscriptions(current, function (object, property, id) {
    if (previous[id] && previous[id][property]) {
      return delete previous[id][property];
    }

    this._container._subscribe(object, property, this.boundUpdate);
  }, this);

  // Iterate over all remaining previous subscriptions and unsubscribe them.
  delete this._subscriptions;
  this._unsubscribe(previous);

  return result;
};

/**
 * Update the susbcription instance with changes.
 *
 * @return {Boolean}
 */
Subscription.prototype.update = function () {
  if (this._triggered || this._unsubscribed) {
    return false;
  }

  this._unsubscribeChildren();

  this._execId = VM.exec(Utils.bind(function () {
    delete this._triggered;
    this._update(this.execute());
  }, this));

  return this._triggered = true;
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
  return raf(fn);
};

/**
 * Cancel an execution.
 *
 * @param {Number} id
 */
VM.exec.cancel = function (id) {
  return raf.cancel(id);
};

/**
 * Create an element from a tag name.
 *
 * @param  {String} tagName
 * @param  {Object} env
 * @return {Node}
 */
VM.createElement = function (tagName) {
  return document.createElement(tagName);
};

/**
 * Copy all the data from one element to another and replace in place.
 *
 * @param  {Node}   node
 * @param  {String} tagName
 * @param  {Object} env
 * @return {Node}
 */
VM.setTagName = function (node, tagName) {
  var newNode = VM.createElement(tagName);

  // Move all child elements to the new node.
  while (node.firstChild) {
    newNode.appendChild(node.firstChild);
  }

  // Copy all the attributes to the new node.
  for (var i = 0; i < node.attributes.length; i++) {
    var attribute = node.attributes[i];
    newNode.setAttribute(attribute.name, attribute.value);
  }

  // Replace the node position in place.
  if (node.parentNode) {
    node.parentNode.replaceChild(newNode, node);
  }

  return newNode;
};

/**
 * Remove an attribute from an element.
 *
 * @param {Node}   el
 * @param {String} name
 * @param {Object} env
 */
VM.removeAttribute = function (el, name) {
  if (!el.hasAttribute(name)) { return; }

  el.removeAttribute(name);

  // Unset the DOM property when the attribute is removed.
  if (ATTRIBUTE_PROPS[el.tagName] && ATTRIBUTE_PROPS[el.tagName][name]) {
    el[ATTRIBUTE_PROPS[el.tagName][name]] = null;
  }
};

/**
 * Set an attribute value on an element.
 *
 * @param {Node}   el
 * @param {String} name
 * @param {*}      value
 * @param {Object} env
 */
VM.setAttribute = function (el, name, value) {
  if (value === false) {
    return VM.removeAttribute(el, name);
  }

  // Set the attribute value to the name when the value is `true`.
  el.setAttribute(name, value === true ? name : value);

  // Update the DOM property when the attribute changes.
  if (ATTRIBUTE_PROPS[el.tagName] && ATTRIBUTE_PROPS[el.tagName][name]) {
    el[ATTRIBUTE_PROPS[el.tagName][name]] = value;
  }
};

/**
 * Create a comment node based on text contents.
 *
 * @param  {String} contents
 * @param  {Object} env
 * @return {Node}
 */
VM.createComment = function (comment) {
  return document.createComment(comment);
};

/**
 * Subscriber to function in the DOMBars execution instance.
 *
 * @param  {Function} fn
 * @param  {Function} create
 * @param  {Function} update
 * @return {Object}
 */
var subscribe = function (fn, create, update) {
  var subscriber = new Subscription(fn, update, this);

  // Immediately alias the starting value.
  subscriber.value = subscriber.execute();
  Utils.isFunction(create) && (subscriber.value = create(subscriber.value));

  return subscriber;
};

/**
 * Wrap a function with a sanitized public subscriber object.
 *
 * @param  {Function} fn
 * @return {Function}
 */
var wrapProgram = function (fn) {
  var container = this;

  var program = function () {
    var subscriber = new Subscription(fn, null, container);
    return subscriber.execute.apply(subscriber, arguments);
  };

  Utils.extend(program, fn);

  return program;
};

/**
 * Render and subscribe a single DOM node using a custom creation function.
 *
 * @param  {Function} fn
 * @param  {Function} create
 * @return {Node}
 */
var subscribeNode = function (fn, create) {
  return subscribe.call(this, fn, function (value) {
    return Utils.trackNode(create(value));
  }, function (value) {
    this.value.replace(create(value));
  }).value.fragment;
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
var createElement = function (fn, cb) {
  return subscribe.call(this, fn, function (value) {
    return VM.createElement(value);
  }, function (value) {
    cb(this.value = VM.setTagName(this.value, value));
  }).value;
};

/**
 * Append an element to the end of another element.
 *
 * @param {Node} parent
 * @param {Node} child
 */
var appendChild = function (parent, child) {
  // Catch errors that occur from trying to append content to a void element.
  try {
    child && parent.appendChild(child);
  } catch (e) {}
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
var setAttribute = function (currentEl, nameFn, valueFn) {
  var attrName = subscribe.call(this, nameFn, null, function (value) {
    VM.removeAttribute(currentEl(), this.value);
    VM.setAttribute(currentEl(), this.value = value, attrValue.value);
  });

  var attrValue = subscribe.call(this, valueFn, null, function (value) {
    VM.setAttribute(currentEl(), attrName.value, this.value = value);
  });

  return VM.setAttribute(currentEl(), attrName.value, attrValue.value);
};

/**
 * Create a DOM element and subscribe to any changes.
 *
 * @param  {Function} fn
 * @return {Node}
 */
var createDOM = function (fn) {
  return subscribeNode.call(this, fn, Utils.domifyExpression);
};

/**
 * Create a text node and subscribe to any changes.
 *
 * @param  {Function} fn
 * @return {Text}
 */
var createText = function (fn) {
  return subscribeNode.call(this, fn, Utils.textifyExpression);
};

/**
 * Create a comment node and subscribe to any changes.
 *
 * @param  {Function} fn
 * @return {Comment}
 */
var createComment = function (fn) {
  return subscribe.call(this, fn, function (value) {
    return VM.createComment(value);
  }, function (value) {
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
var program = function (i, fn, data) {
  var programWrapper = this.programs[i];

  if (data) {
    return VM.program(i, fn, data);
  }

  if (!programWrapper) {
    return this.programs[i] = VM.program(i, fn);
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
var merge = function (param, common) {
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
var get = function (object, property, id) {
  this.subscription.subscribe(object, property, id);
  return this._get(object, property);
};

/**
 * Generate an executable template from a template spec.
 *
 * @param  {Object}   templateSpec
 * @return {Function}
 */
VM.template = function (templateSpec, env) {
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
    get:              get,
    merge:            merge,
    program:          program,
    createDOM:        createDOM,
    createText:       createText,
    createComment:    createComment,
    createElement:    createElement,
    appendChild:      appendChild,
    setAttribute:     setAttribute,
    escapeExpression: Utils.escapeExpression,
    programWithDepth: VM.programWithDepth
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

    var namespace = options.partial ? options : env;
    var helpers, partials;

    if (!options.partial) {
      helpers  = options.helpers;
      partials = options.partials;
    }

    // Create a custom container for each execution.
    var containment = {};

    // Allows custom subscription options to be passed through each time.
    Utils.extend(containment, container);
    containment._get         = options.get         || env.get;
    containment._subscribe   = options.subscribe   || env.subscribe;
    containment._unsubscribe = options.unsubscribe || env.unsubscribe;

    var result = wrapProgram.call(containment, templateSpec).call(
      containment,
      namespace,
      context,
      helpers,
      partials,
      options.data
    );

    if (!options.partial) {
      env.VM.checkRevision(containment.compilerInfo);
    }

    return result;
  };
};

},{"./raf":4,"./utils":8,"handlebars/dist/cjs/handlebars/runtime":11}],6:[function(_dereq_,module,exports){
module.exports = _dereq_(
  'handlebars/dist/cjs/handlebars/safe-string'
)['default'];

},{"handlebars/dist/cjs/handlebars/safe-string":12}],7:[function(_dereq_,module,exports){
var TrackNode = module.exports = function (node) {
  this.fragment = document.createDocumentFragment();

  // Instantly append a before and after tracking node.
  this.before = this.fragment.appendChild(document.createTextNode(''));
  this.after  = this.fragment.appendChild(document.createTextNode(''));

  // Append the passed in node to the current fragment.
  node && this.appendChild(node);
};

/**
 * Append a node to the current tracking fragment.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.appendChild = function (node) {
  this.after.parentNode && this.after.parentNode.insertBefore(node, this.after);

  return this;
};

/**
 * Prepend a node to the current tracking fragment.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.prependChild = function (node) {
  this.before.parentNode.insertBefore(node, this.before.nextSibling);

  return this;
};

/**
 * Remove all elements between the two tracking nodes.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.empty = function () {
  while (this.before.nextSibling && this.before.nextSibling !== this.after) {
    this.before.parentNode.removeChild(this.before.nextSibling);
  }

  return this;
};

/**
 * Remove the the elements from the DOM.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.remove = function () {
  while (this.before.nextSibling && this.before.nextSibling !== this.after) {
    this.fragment.appendChild(this.before.nextSibling);
  }

  // Pull the two reference nodes out of the DOM and into the fragment.
  this.fragment.appendChild(this.after);
  this.fragment.insertBefore(this.before, this.fragment.firstChild);

  return this;
};

/**
 * Replace the contents of the tracking node with new contents.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.replace = function (node) {
  return this.empty().appendChild(node);
};

},{}],8:[function(_dereq_,module,exports){
var hbsUtils   = _dereq_('handlebars/dist/cjs/handlebars/utils');
var uniqueId   = 0;
var TrackNode  = _dereq_('./track-node');
var SafeString = _dereq_('./safe-string');
var __slice    = Array.prototype.slice;

/**
 * Simple way to subclass an object, with support for older browsers.
 *
 * @return {Object}
 */
var create = Object.create || (function () {
  var F = function () {};

  return function (o) {
    F.prototype = o;
    var obj = new F();
    F.prototype = null;
    return obj;
  };
})();

/**
 * Extend Handlebars utilities with DOM functionality.
 *
 * @type {Object}
 */
var Utils = module.exports = create(hbsUtils);

/**
 * Return a unique id.
 *
 * @return {Number}
 */
Utils.uniqueId = function () {
  return uniqueId++;
};

/**
 * Create a function that accepts an unlimited number of arguments as the last
 * argument.
 *
 * @param  {Function} fn
 * @return {Function}
 */
Utils.variadic = function (fn) {
  var count = Math.max(fn.length - 1, 0);

  return function () {
    var args = __slice.call(arguments, 0, count);

    // Enforce the array length, in case we didn't have enough arguments.
    args.length = count;
    args.push(__slice.call(arguments, count));

    return fn.apply(this, args);
  };
};

/**
 * Simple partial application function.
 *
 * @param  {Function} fn
 * @param  {*}        ...
 * @return {Function}
 */
Utils.partial = Utils.variadic(function (fn, args) {
  return Utils.variadic(function (called) {
    return fn.apply(this, args.concat(called));
  });
});

/**
 * Bind a function to a certain context.
 *
 * @param  {Function} fn
 * @param  {Object}   context
 * @param  {*}        ...
 * @return {Function}
 */
Utils.bind = Utils.variadic(function (fn, context, args) {
  return Utils.variadic(function (called) {
    return fn.apply(context, args.concat(called));
  });
});

/**
 * Expose the create function.
 *
 * @type {Function}
 */
Utils.create = create;

/**
 * Check whether an object is actually a DOM node.
 *
 * @param  {*}       o
 * @return {Boolean}
 */
Utils.isNode = function (o) {
  return typeof o === 'object' && o.ownerDocument === window.document;
};

/**
 * Track a node instance anywhere it goes in the DOM.
 *
 * @param  {Node}      node
 * @return {TrackNode}
 */
Utils.trackNode = function (node) {
  return new TrackNode(node);
};

/**
 * Transform a string into arbitrary DOM nodes.
 *
 * @param  {String} string
 * @return {Node}
 */
Utils.domifyExpression = function (string) {
  // If we passed in a safe string, get the actual value.
  if (string instanceof SafeString) {
    string = string.string;
  }

  // No need to coerce a node.
  if (Utils.isNode(string)) {
    return string;
  }

  var div = document.createElement('div');
  div.innerHTML = string;

  if (div.childNodes.length === 1) {
    return div.removeChild(div.childNodes[0]);
  }

  var fragment = document.createDocumentFragment();

  while (div.firstChild) {
    fragment.appendChild(div.firstChild);
  }

  return fragment;
};

/**
 * Transform a string into a DOM text node for appending to the template.
 *
 * @param  {String} string
 * @return {Text}
 */
Utils.textifyExpression = function (string) {
  if (string instanceof SafeString) {
    return Utils.domifyExpression(string.string);
  }

  // Catch when the string is actually a DOM node and turn it into a string.
  if (Utils.isNode(string)) {
    // Already a text node, just return it immediately.
    if (string.nodeType === 3) {
      return string;
    }

    if (typeof string.outerHTML === 'string') {
      return document.createTextNode(string.outerHTML);
    }

    var div = document.createElement('div');
    div.appendChild(string.cloneNode(true));
    return document.createTextNode(div.innerHTML);
  }

  return document.createTextNode(string == null ? '' : string);
};

},{"./safe-string":6,"./track-node":7,"handlebars/dist/cjs/handlebars/utils":13}],9:[function(_dereq_,module,exports){
"use strict";
var Utils = _dereq_("./utils");
var Exception = _dereq_("./exception")["default"];

var VERSION = "1.3.0";
exports.VERSION = VERSION;var COMPILER_REVISION = 4;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn, inverse) {
    if (toString.call(name) === objectType) {
      if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      if (inverse) { fn.not = inverse; }
      this.helpers[name] = fn;
    }
  },

  registerPartial: function(name, str) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = str;
    }
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(arg) {
    if(arguments.length === 2) {
      return undefined;
    } else {
      throw new Exception("Missing helper: '" + arg + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse || function() {}, fn = options.fn;

    if (isFunction(context)) { context = context.call(this); }

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      return fn(context);
    }
  });

  instance.registerHelper('each', function(context, options) {
    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) { 
              data.key = key; 
              data.index = i;
              data.first = (i === 0);
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    if (!Utils.isEmpty(context)) return options.fn(context);
  });

  instance.registerHelper('log', function(context, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, context);
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, obj) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};
exports.logger = logger;
function log(level, obj) { logger.log(level, obj); }

exports.log = log;var createFrame = function(object) {
  var obj = {};
  Utils.extend(obj, object);
  return obj;
};
exports.createFrame = createFrame;
},{"./exception":10,"./utils":13}],10:[function(_dereq_,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],11:[function(_dereq_,module,exports){
"use strict";
var Utils = _dereq_("./utils");
var Exception = _dereq_("./exception")["default"];
var COMPILER_REVISION = _dereq_("./base").COMPILER_REVISION;
var REVISION_CHANGES = _dereq_("./base").REVISION_CHANGES;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Exception("No environment passed to template");
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  var invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
    var result = env.VM.invokePartial.apply(this, arguments);
    if (result != null) { return result; }

    if (env.compile) {
      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,
    programs: [],
    program: function(i, fn, data) {
      var programWrapper = this.programs[i];
      if(data) {
        programWrapper = program(i, fn, data);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(i, fn);
      }
      return programWrapper;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = {};
        Utils.extend(ret, common);
        Utils.extend(ret, param);
      }
      return ret;
    },
    programWithDepth: env.VM.programWithDepth,
    noop: env.VM.noop,
    compilerInfo: null
  };

  return function(context, options) {
    options = options || {};
    var namespace = options.partial ? options : env,
        helpers,
        partials;

    if (!options.partial) {
      helpers = options.helpers;
      partials = options.partials;
    }
    var result = templateSpec.call(
          container,
          namespace, context,
          helpers,
          partials,
          options.data);

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  };
}

exports.template = template;function programWithDepth(i, fn, data /*, $depth */) {
  var args = Array.prototype.slice.call(arguments, 3);

  var prog = function(context, options) {
    options = options || {};

    return fn.apply(this, [context, options.data || data].concat(args));
  };
  prog.program = i;
  prog.depth = args.length;
  return prog;
}

exports.programWithDepth = programWithDepth;function program(i, fn, data) {
  var prog = function(context, options) {
    options = options || {};

    return fn(context, options.data || data);
  };
  prog.program = i;
  prog.depth = 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;
},{"./base":9,"./exception":10,"./utils":13}],12:[function(_dereq_,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],13:[function(_dereq_,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = _dereq_("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr] || "&amp;";
}

function extend(obj, value) {
  for(var key in value) {
    if(Object.prototype.hasOwnProperty.call(value, key)) {
      obj[key] = value[key];
    }
  }
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (!string && string !== 0) {
    return "";
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;
},{"./safe-string":12}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvZmFrZV8xNjA3MDU2NS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2V4Y2VwdGlvbi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9yYWYuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9zYWZlLXN0cmluZy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi90cmFjay1ub2RlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3V0aWxzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9leGNlcHRpb24uanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6bEJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBiYXNlICAgICAgID0gcmVxdWlyZSgnLi9saWIvYmFzZScpO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKCcuL2xpYi9zYWZlLXN0cmluZycpO1xudmFyIEV4Y2VwdGlvbiAgPSByZXF1aXJlKCcuL2xpYi9leGNlcHRpb24nKTtcbnZhciBVdGlscyAgICAgID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBydW50aW1lICAgID0gcmVxdWlyZSgnLi9saWIvcnVudGltZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBjcmVhdGUgKCkge1xuICB2YXIgZGIgPSBuZXcgYmFzZS5ET01CYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoZGIsIGJhc2UpO1xuICBkYi5WTSAgICAgICAgID0gcnVudGltZTtcbiAgZGIuVXRpbHMgICAgICA9IFV0aWxzO1xuICBkYi5jcmVhdGUgICAgID0gY3JlYXRlO1xuICBkYi5FeGNlcHRpb24gID0gRXhjZXB0aW9uO1xuICBkYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcblxuICBkYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uIChzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgZGIpO1xuICB9O1xuXG4gIHJldHVybiBkYjtcbn0pKCk7XG4iLCJ2YXIgaGJzQmFzZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2Jhc2UnKTtcbnZhciBVdGlscyAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gaGJzQmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQ7XG5cbi8qKlxuICogRXh0ZW5kIEhhbmRsZWJhcnMgYmFzZSBvYmplY3Qgd2l0aCBjdXN0b20gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgYmFzZSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic0Jhc2UpO1xuXG4vKipcbiAqIFJlZ2lzdGVyIERPTUJhcnMgaGVscGVycyBvbiB0aGUgcGFzc2VkIGluIERPTUJhcnMgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlXG4gKi9cbnZhciByZWdpc3RlckRlZmF1bHRIZWxwZXJzID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gIC8qKlxuICAgKiBUaGUgaGFuZGxlYmFycyBgZWFjaGAgaGVscGVyIGlzIGluY29tcGF0aWJhYmxlIHdpdGggRE9NQmFycywgc2luY2UgaXRcbiAgICogYXNzdW1lcyBzdHJpbmcgY29uY2F0aW5hdGlvbiAoYXMgb3Bwb3NlZCB0byBkb2N1bWVudCBmcmFnbWVudHMpLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGZuICAgICAgID0gb3B0aW9ucy5mbjtcbiAgICB2YXIgaW52ZXJzZSAgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHZhciBpICAgICAgICA9IDA7XG4gICAgdmFyIGRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IFV0aWxzLmNyZWF0ZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBsZW4gPSBjb250ZXh0Lmxlbmd0aDtcblxuICAgICAgaWYgKGxlbiA9PT0gK2xlbikge1xuICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IGxlbiAtIDEpO1xuXG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIGkgKz0gMTtcblxuICAgICAgICAgICAgZGF0YS5rZXkgICA9IGtleTtcbiAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcblxuICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtrZXldLCB7IGRhdGE6IGRhdGEgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBjdXN0b20gRE9NQmFycyBlbnZpcm9ubWVudCB0byBtYXRjaCBIYW5kbGViYXJzRW52aXJvbm1lbnQuXG4gKi9cbnZhciBET01CYXJzRW52aXJvbm1lbnQgPSBiYXNlLkRPTUJhcnNFbnZpcm9ubWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgSGFuZGxlYmFyc0Vudmlyb25tZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59O1xuXG4vKipcbiAqIEV4dGVuZCB0aGUgSGFuZGxlYmFyc0Vudmlyb25tZW50IHByb3RvdHlwZS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgZW52UHJvdG90eXBlID0gRE9NQmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IFV0aWxzLmNyZWF0ZShcbiAgSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZVxuKTtcblxuLyoqXG4gKiBBbGlhcyBzb21lIHVzZWZ1bCBmdW5jdGlvbmFsaXR5IHRoYXQgaXMgZXhwZWN0ZWQgdG8gYmUgZXhwb3NlZCBvbiB0aGUgcm9vdFxuICogb2JqZWN0LlxuICovXG5lbnZQcm90b3R5cGUuY3JlYXRlRnJhbWUgICAgICAgPSBoYnNCYXNlLmNyZWF0ZUZyYW1lO1xuZW52UHJvdG90eXBlLlJFVklTSU9OX0NIQU5HRVMgID0gaGJzQmFzZS5SRVZJU0lPTl9DSEFOR0VTO1xuZW52UHJvdG90eXBlLkNPTVBJTEVSX1JFVklTSU9OID0gaGJzQmFzZS5DT01QSUxFUl9SRVZJU0lPTjtcblxuLyoqXG4gKiBUaGUgYmFzaWMgZ2V0dGVyIGZ1bmN0aW9uLiBPdmVycmlkZSB0aGlzIHdpdGggc29tZXRoaW5nIGVsc2UgYmFzZWQgb24geW91clxuICogcHJvamVjdC4gRm9yIGV4YW1wbGUsIEJhY2tib25lLmpzIG1vZGVscy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBwcm9wZXJ0eVxuICogQHJldHVybiB7Kn1cbiAqL1xuZW52UHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5KSB7XG4gIHJldHVybiBvYmplY3RbcHJvcGVydHldO1xufTtcblxuLyoqXG4gKiBOb29wIGZ1bmN0aW9ucyBmb3Igc3Vic2NyaWJlIGFuZCB1bnN1YnNjcmliZS4gT3ZlcnJpZGUgd2l0aCBjdXN0b21cbiAqIGZ1bmN0aW9uYWxpdHkuXG4gKi9cbmVudlByb3RvdHlwZS5zdWJzY3JpYmUgPSBlbnZQcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7fTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbicpWydkZWZhdWx0J107XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKipcbiAqIFdyYXAgaW4gYW4gYW5vbnltb3VzIGZ1bmN0aW9uIHRvIGFsaWFzIHRpbWVyIHV0aWxpdGllcy5cbiAqL1xuKGZ1bmN0aW9uIChzZXRUaW1lb3V0LCBjbGVhclRpbWVvdXQsIERhdGUpIHtcbiAgLyoqXG4gICAqIEZhbGxiYWNrIGFuaW1hdGlvbiBmcmFtZSBpbXBsZW1lbnRhdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgZmFsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBjdXJyZW50IHRpbWVzdGFtcCBpbnRlZ2VyLlxuICAgICAqL1xuICAgIHZhciBub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfTtcblxuICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhlIHByZXZpb3VzIFwiYW5pbWF0aW9uIGZyYW1lXCIgbWFudWFsbHkuXG4gICAgdmFyIHByZXYgPSBub3coKTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHZhciBjdXJyID0gbm93KCk7XG4gICAgICB2YXIgbXMgICA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnIgLSBwcmV2KSk7XG4gICAgICB2YXIgcmVxICA9IHNldFRpbWVvdXQoZm4sIG1zKTtcblxuICAgICAgcHJldiA9IGN1cnI7XG5cbiAgICAgIHJldHVybiByZXE7XG4gICAgfTtcbiAgfTtcblxuICAvKipcbiAgICogRXhwb3NlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICAgKlxuICAgKiBAdHlwZSB7RnVuY3Rpb259XG4gICAqL1xuICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGZhbGxiYWNrKCk7XG5cbiAgLyoqXG4gICAqIENhbmNlbCB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAdHlwZSB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgY2FuY2VsID0gZ2xvYmFsLmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwub0NhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgY2xlYXJUaW1lb3V0O1xuXG4gIC8qKlxuICAgKiBDYW5jZWwgYW4gYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gaWRcbiAgICovXG4gIGV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgY2FuY2VsKGlkKTtcbiAgfTtcbn0pKHNldFRpbWVvdXQsIGNsZWFyVGltZW91dCwgRGF0ZSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIGhic1ZNID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUnKTtcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciByYWYgICA9IHJlcXVpcmUoJy4vcmFmJyk7XG5cbi8qKlxuICogS2VlcCBhIG1hcCBvZiBhdHRyaWJ1dGVzIHRoYXQgbmVlZCB0byB1cGRhdGUgdGhlIGNvcnJlc3BvbmRpbmcgcHJvcGVydGllcy5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgQVRUUklCVVRFX1BST1BTID0ge1xuICBJTlBVVDoge1xuICAgIHZhbHVlOiAgICd2YWx1ZScsXG4gICAgY2hlY2tlZDogJ2NoZWNrZWQnXG4gIH0sXG4gIE9QVElPTjoge1xuICAgIHNlbGVjdGVkOiAnc2VsZWN0ZWQnXG4gIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGEgc3Vic2NyaXB0aW9ucyBvYmplY3QsIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIHRoZSBvYmplY3RcbiAqIHByb3BlcnR5IGRldGFpbHMgYW5kIGEgdW5pcXVlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9ICAgIHN1YnNjcmlwdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICovXG52YXIgaXRlcmF0ZVN1YnNjcmlwdGlvbnMgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucywgZm4sIGNvbnRleHQpIHtcbiAgZm9yICh2YXIgaWQgaW4gc3Vic2NyaXB0aW9ucykge1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnNbaWRdKSB7XG4gICAgICBmbi5jYWxsKGNvbnRleHQsIHN1YnNjcmlwdGlvbnNbaWRdW3Byb3BlcnR5XSwgcHJvcGVydHksIGlkKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IHN1YnNjaXB0aW9uIGluc3RhbmNlLiBUaGlzIGZ1bmN0aW9uYWxpdHkgaXMgdGlnaHRseSBjb3VwbGVkIHRvXG4gKiBET01CYXJzIHByb2dyYW0gZXhlY3V0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB1cGRhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGNvbnRhaW5lclxuICovXG52YXIgU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKGZuLCB1cGRhdGUsIGNvbnRhaW5lcikge1xuICAvLyBBbGlhcyBwYXNzZWQgaW4gdmFyaWFibGVzIGZvciBsYXRlciBhY2Nlc3MuXG4gIHRoaXMuX2ZuICAgICAgICA9IGZuO1xuICB0aGlzLl91cGRhdGUgICAgPSB1cGRhdGU7XG4gIHRoaXMuX2NvbnRhaW5lciA9IGNvbnRhaW5lcjtcblxuICAvLyBBc3NpZ24gZXZlcnkgc3Vic2NyaXB0aW9uIGluc3RhbmNlIGEgdW5pcXVlIGlkLiBUaGlzIGhlbHBzIHdpdGggbGlua2luZ1xuICAvLyBiZXR3ZWVuIHBhcmVudCBhbmQgY2hpbGQgc3Vic2NyaXB0aW9uIGluc3RhbmNlcy5cbiAgdGhpcy5jaWQgICAgICAgICAgICAgPSAnYycgKyBVdGlscy51bmlxdWVJZCgpO1xuICB0aGlzLmNoaWxkcmVuICAgICAgICA9IHt9O1xuICB0aGlzLnN1YnNjcmlwdGlvbnMgICA9IHt9O1xuICB0aGlzLnVuc3Vic2NyaXB0aW9ucyA9IFtdO1xuXG4gIC8vIENyZWF0ZSBzdGF0aWNhbGx5IGJvdW5kIGZ1bmN0aW9uIGluc3RhbmNlcyBmb3IgcHVibGljIGNvbnN1bXB0aW9uLlxuICB0aGlzLmJvdW5kVXBkYXRlICAgICAgICAgPSBVdGlscy5iaW5kKHRoaXMudXBkYXRlLCB0aGlzKTtcbiAgdGhpcy5ib3VuZFVuc3Vic2NyaXB0aW9uID0gVXRpbHMuYmluZCh0aGlzLnVuc3Vic2NyaXB0aW9uLCB0aGlzKTtcbn07XG5cbi8qKlxuICogRXhwb3NlIHRoZSBpbnRlcm5hbCBzdXNiY3JpYmUgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGNvbnRhaW5lci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZFxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAodGhpcy5zdWJzY3JpcHRpb25zW2lkXSB8fCAodGhpcy5zdWJzY3JpcHRpb25zW2lkXSA9IHt9KSlbcHJvcGVydHldID0gb2JqZWN0O1xufTtcblxuLyoqXG4gKiBQYXNzIGEgY3VzdG9tIHVuc3Vic2NyaXB0aW9uIGZ1bmN0aW9uIHRoYXQgd2lsbCBleGVjdXRlIHdoZW4gd2UgdW5zdWJzY3JpYmUuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uIChmbikge1xuICBVdGlscy5pc0Z1bmN0aW9uKGZuKSAmJiB0aGlzLnVuc3Vic2NyaXB0aW9ucy5wdXNoKGZuKTtcbn07XG5cbi8qKlxuICogVW5zdWJzY3JpYmUgZnJvbSBhIHN1YmNyaXB0aW9ucyBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHN1YnNjcmlwdGlvbnNcbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucykge1xuICBpdGVyYXRlU3Vic2NyaXB0aW9ucyhzdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgICBkZWxldGUgc3Vic2NyaXB0aW9uc1tpZF1bcHJvcGVydHldO1xuICAgIHRoaXMuX2NvbnRhaW5lci5fdW5zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgdGhpcy5ib3VuZFVwZGF0ZSk7XG4gIH0sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYW4gYXJyYXkgb2YgdW5zdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHVuc3Vic2NyaXB0aW9uc1xuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLl91bnN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uICh1bnN1YnNjcmlwdGlvbnMpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1bnN1YnNjcmlwdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB1bnN1YnNjcmlwdGlvbnNbaV0oKTtcbiAgfVxufTtcblxuLyoqXG4gKiBVbnN1YnNjcmliZSBldmVyeXRoaW5nIGZyb20gdGhlIGN1cnJlbnQgaW5zdGFuY2UuXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl91bnN1YnNjcmliZWQpIHsgcmV0dXJuOyB9XG5cbiAgdGhpcy5fdW5zdWJzY3JpYmUodGhpcy5zdWJzY3JpcHRpb25zKTtcbiAgdGhpcy5fdW5zdWJzY3JpcHRpb24odGhpcy51bnN1YnNjcmlwdGlvbnMpO1xuXG4gIC8vIERlbGV0ZSBhbnkgcmVmZXJlbmNlIHRvIHRoaXMgc3Vic2NyaXB0aW9uIGZyb20gdGhlIHBhcmVudC5cbiAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgZGVsZXRlIHRoaXMucGFyZW50LmNoaWxkcmVuW3RoaXMuY2lkXTtcbiAgICBkZWxldGUgdGhpcy5wYXJlbnQ7XG4gIH1cblxuICAvLyBDYW5jZWwgYW55IGN1cnJlbnRseSBleGVjdXRpbmcgZnVuY3Rpb25zLiBXZSBhbHNvIG5lZWQgdG8gc2V0IGFuXG4gIC8vIHVuc3Vic2NyaWJlZCBmbGFnIGluIGNhc2UgdGhlIGZ1bmN0aW9uIGlzIHN0aWxsIGF2YWlsYWJsZSBzb21ld2hlcmUgYW5kXG4gIC8vIGNhbGxlZCBhZnRlciB1bnN1YnNjcmlwdGlvbiBoYXMgb2NjdXJlZC5cbiAgVk0uZXhlYy5jYW5jZWwodGhpcy5fZXhlY0lkKTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVkID0gdHJ1ZTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gIC8vIFJlbW92ZSB1bndhbnRlZCBsaW5nZXJpbmcgcmVmZXJlbmNlcy5cbiAgZGVsZXRlIHRoaXMuY2hpbGRyZW47XG4gIGRlbGV0ZSB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gIGRlbGV0ZSB0aGlzLnVuc3Vic2NyaXB0aW9ucztcbiAgZGVsZXRlIHRoaXMuX2ZuO1xuICBkZWxldGUgdGhpcy5fdXBkYXRlO1xuICBkZWxldGUgdGhpcy5fY29udGFpbmVyO1xuICBkZWxldGUgdGhpcy5ib3VuZFVwZGF0ZTtcbiAgZGVsZXRlIHRoaXMuYm91bmRVbnN1YnNjcmlwdGlvbjtcbn07XG5cbi8qKlxuICogVW5zdWJzY3JpYmUgdGhlIGN1cnJlbnQgaW5zdGFuY2UgY2hpbGRyZW4uXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGNoaWxkIGluIHRoaXMuY2hpbGRyZW4pIHtcbiAgICB0aGlzLmNoaWxkcmVuW2NoaWxkXS51bnN1YnNjcmliZSgpO1xuICB9XG59O1xuXG4vKipcbiAqIEV4ZWN1dGUgdGhlIHN1YnNjcmlwdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHsqfVxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzLl9jb250YWluZXIuc3Vic2NyaXB0aW9uO1xuXG4gIC8vIElmIHdlIGhhdmUgYW4gZXhpc3Rpbmcgc3Vic2NyaXB0aW9uLCBsaW5rIHRoZSBzdWJzY3JpcHRpb25zIHRvZ2V0aGVyLlxuICBpZiAocGFyZW50ICYmICFwYXJlbnQuX3Vuc3Vic2NyaWJlZCkge1xuICAgIHRoaXMucGFyZW50ID0gdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbjtcbiAgICB0aGlzLnBhcmVudC5jaGlsZHJlblt0aGlzLmNpZF0gPSB0aGlzO1xuICB9XG5cbiAgLy8gQWxpYXMgdGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBvYmplY3QgZm9yIGRpZmZpbmcgYWZ0ZXIgZXhlY3V0aW9uLlxuICB0aGlzLl9zdWJzY3JpcHRpb25zID0gdGhpcy5zdWJzY3JpcHRpb25zO1xuICB0aGlzLl91bnN1YnNjcmlwdGlvbih0aGlzLnVuc3Vic2NyaXB0aW9ucyk7XG5cbiAgLy8gUmVzZXQgdGhlIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaXB0aW9ucyBvYmplY3RzIGJlZm9yZSBleGVjdXRpb24uXG4gIHRoaXMuc3Vic2NyaXB0aW9ucyAgID0ge307XG4gIHRoaXMudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbiA9IHRoaXM7XG4gIHZhciByZXN1bHQgPSB0aGlzLl9mbi5hcHBseSh0aGlzLl9jb250YWluZXIsIGFyZ3VtZW50cyk7XG4gIHRoaXMuX2NvbnRhaW5lci5zdWJzY3JpcHRpb24gPSB0aGlzLnBhcmVudDtcblxuICAvLyBUaGUgY3VycmVudCBzdWJzY3JpcHRpb25zIG9iamVjdCBuZWVkcyB0byBiZSBjb21wYXJlZCBhZ2FpbnN0IHRoZSBwcmV2aW91c1xuICAvLyBzdWJzY3JpcHRpb25zIGFuZCBhbnkgZGlmZmVuY2VzIGZpeGVkLlxuICB2YXIgY3VycmVudCAgPSB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gIHZhciBwcmV2aW91cyA9IHRoaXMuX3N1YnNjcmlwdGlvbnM7XG5cbiAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBuZXcgc3Vic2NyaXB0aW9ucyBvYmplY3QuIENoZWNrIGV2ZXJ5IGtleSBpbiB0aGUgb2JqZWN0XG4gIC8vIGFnYWluc3QgdGhlIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMuIElmIGl0IGV4aXN0cyBpbiB0aGUgcHJldmlvdXMgb2JqZWN0LFxuICAvLyBpdCBtZWFucyB3ZSBhcmUgYWxyZWFkeSBzdWJzY3JpYmVkLiBPdGhlcndpc2Ugd2UgbmVlZCB0byBzdWJzY3JpYmUgdG9cbiAgLy8gdGhlIG5ldyBwcm9wZXJ0eS5cbiAgaXRlcmF0ZVN1YnNjcmlwdGlvbnMoY3VycmVudCwgZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGlkKSB7XG4gICAgaWYgKHByZXZpb3VzW2lkXSAmJiBwcmV2aW91c1tpZF1bcHJvcGVydHldKSB7XG4gICAgICByZXR1cm4gZGVsZXRlIHByZXZpb3VzW2lkXVtwcm9wZXJ0eV07XG4gICAgfVxuXG4gICAgdGhpcy5fY29udGFpbmVyLl9zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgdGhpcy5ib3VuZFVwZGF0ZSk7XG4gIH0sIHRoaXMpO1xuXG4gIC8vIEl0ZXJhdGUgb3ZlciBhbGwgcmVtYWluaW5nIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaWJlIHRoZW0uXG4gIGRlbGV0ZSB0aGlzLl9zdWJzY3JpcHRpb25zO1xuICB0aGlzLl91bnN1YnNjcmliZShwcmV2aW91cyk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBzdXNiY3JpcHRpb24gaW5zdGFuY2Ugd2l0aCBjaGFuZ2VzLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fdHJpZ2dlcmVkIHx8IHRoaXMuX3Vuc3Vic2NyaWJlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRoaXMuX3Vuc3Vic2NyaWJlQ2hpbGRyZW4oKTtcblxuICB0aGlzLl9leGVjSWQgPSBWTS5leGVjKFV0aWxzLmJpbmQoZnVuY3Rpb24gKCkge1xuICAgIGRlbGV0ZSB0aGlzLl90cmlnZ2VyZWQ7XG4gICAgdGhpcy5fdXBkYXRlKHRoaXMuZXhlY3V0ZSgpKTtcbiAgfSwgdGhpcykpO1xuXG4gIHJldHVybiB0aGlzLl90cmlnZ2VyZWQgPSB0cnVlO1xufTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnMgcnVudGltZSBlbnZpcm9ubWVudCB3aXRoIERPTSBzcGVjaWZpYyBoZWxwZXJzLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBWTSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic1ZNKTtcblxuLyoqXG4gKiBCaW5kIGEgZnVuY3Rpb24gdG8gdGhlIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gcmFmKGZuKTtcbn07XG5cbi8qKlxuICogQ2FuY2VsIGFuIGV4ZWN1dGlvbi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWRcbiAqL1xuVk0uZXhlYy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgcmV0dXJuIHJhZi5jYW5jZWwoaWQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gZWxlbWVudCBmcm9tIGEgdGFnIG5hbWUuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSB0YWdOYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IGVudlxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuVk0uY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xufTtcblxuLyoqXG4gKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gICBub2RlXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAqIEBwYXJhbSAge09iamVjdH0gZW52XG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5WTS5zZXRUYWdOYW1lID0gZnVuY3Rpb24gKG5vZGUsIHRhZ05hbWUpIHtcbiAgdmFyIG5ld05vZGUgPSBWTS5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuXG4gIC8vIE1vdmUgYWxsIGNoaWxkIGVsZW1lbnRzIHRvIHRoZSBuZXcgbm9kZS5cbiAgd2hpbGUgKG5vZGUuZmlyc3RDaGlsZCkge1xuICAgIG5ld05vZGUuYXBwZW5kQ2hpbGQobm9kZS5maXJzdENoaWxkKTtcbiAgfVxuXG4gIC8vIENvcHkgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIHRoZSBuZXcgbm9kZS5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYXR0cmlidXRlID0gbm9kZS5hdHRyaWJ1dGVzW2ldO1xuICAgIG5ld05vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUpO1xuICB9XG5cbiAgLy8gUmVwbGFjZSB0aGUgbm9kZSBwb3NpdGlvbiBpbiBwbGFjZS5cbiAgaWYgKG5vZGUucGFyZW50Tm9kZSkge1xuICAgIG5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgbm9kZSk7XG4gIH1cblxuICByZXR1cm4gbmV3Tm9kZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfSAgIGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IGVudlxuICovXG5WTS5yZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWwsIG5hbWUpIHtcbiAgaWYgKCFlbC5oYXNBdHRyaWJ1dGUobmFtZSkpIHsgcmV0dXJuOyB9XG5cbiAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuXG4gIC8vIFVuc2V0IHRoZSBET00gcHJvcGVydHkgd2hlbiB0aGUgYXR0cmlidXRlIGlzIHJlbW92ZWQuXG4gIGlmIChBVFRSSUJVVEVfUFJPUFNbZWwudGFnTmFtZV0gJiYgQVRUUklCVVRFX1BST1BTW2VsLnRhZ05hbWVdW25hbWVdKSB7XG4gICAgZWxbQVRUUklCVVRFX1BST1BTW2VsLnRhZ05hbWVdW25hbWVdXSA9IG51bGw7XG4gIH1cbn07XG5cbi8qKlxuICogU2V0IGFuIGF0dHJpYnV0ZSB2YWx1ZSBvbiBhbiBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gICBlbFxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7Kn0gICAgICB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IGVudlxuICovXG5WTS5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWwsIG5hbWUsIHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gVk0ucmVtb3ZlQXR0cmlidXRlKGVsLCBuYW1lKTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgYXR0cmlidXRlIHZhbHVlIHRvIHRoZSBuYW1lIHdoZW4gdGhlIHZhbHVlIGlzIGB0cnVlYC5cbiAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlID09PSB0cnVlID8gbmFtZSA6IHZhbHVlKTtcblxuICAvLyBVcGRhdGUgdGhlIERPTSBwcm9wZXJ0eSB3aGVuIHRoZSBhdHRyaWJ1dGUgY2hhbmdlcy5cbiAgaWYgKEFUVFJJQlVURV9QUk9QU1tlbC50YWdOYW1lXSAmJiBBVFRSSUJVVEVfUFJPUFNbZWwudGFnTmFtZV1bbmFtZV0pIHtcbiAgICBlbFtBVFRSSUJVVEVfUFJPUFNbZWwudGFnTmFtZV1bbmFtZV1dID0gdmFsdWU7XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGJhc2VkIG9uIHRleHQgY29udGVudHMuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBjb250ZW50c1xuICogQHBhcmFtICB7T2JqZWN0fSBlbnZcbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cblZNLmNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbiAoY29tbWVudCkge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChjb21tZW50KTtcbn07XG5cbi8qKlxuICogU3Vic2NyaWJlciB0byBmdW5jdGlvbiBpbiB0aGUgRE9NQmFycyBleGVjdXRpb24gaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY3JlYXRlXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gdXBkYXRlXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBzdWJzY3JpYmUgPSBmdW5jdGlvbiAoZm4sIGNyZWF0ZSwgdXBkYXRlKSB7XG4gIHZhciBzdWJzY3JpYmVyID0gbmV3IFN1YnNjcmlwdGlvbihmbiwgdXBkYXRlLCB0aGlzKTtcblxuICAvLyBJbW1lZGlhdGVseSBhbGlhcyB0aGUgc3RhcnRpbmcgdmFsdWUuXG4gIHN1YnNjcmliZXIudmFsdWUgPSBzdWJzY3JpYmVyLmV4ZWN1dGUoKTtcbiAgVXRpbHMuaXNGdW5jdGlvbihjcmVhdGUpICYmIChzdWJzY3JpYmVyLnZhbHVlID0gY3JlYXRlKHN1YnNjcmliZXIudmFsdWUpKTtcblxuICByZXR1cm4gc3Vic2NyaWJlcjtcbn07XG5cbi8qKlxuICogV3JhcCBhIGZ1bmN0aW9uIHdpdGggYSBzYW5pdGl6ZWQgcHVibGljIHN1YnNjcmliZXIgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbnZhciB3cmFwUHJvZ3JhbSA9IGZ1bmN0aW9uIChmbikge1xuICB2YXIgY29udGFpbmVyID0gdGhpcztcblxuICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3Vic2NyaWJlciA9IG5ldyBTdWJzY3JpcHRpb24oZm4sIG51bGwsIGNvbnRhaW5lcik7XG4gICAgcmV0dXJuIHN1YnNjcmliZXIuZXhlY3V0ZS5hcHBseShzdWJzY3JpYmVyLCBhcmd1bWVudHMpO1xuICB9O1xuXG4gIFV0aWxzLmV4dGVuZChwcm9ncmFtLCBmbik7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59O1xuXG4vKipcbiAqIFJlbmRlciBhbmQgc3Vic2NyaWJlIGEgc2luZ2xlIERPTSBub2RlIHVzaW5nIGEgY3VzdG9tIGNyZWF0aW9uIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7RnVuY3Rpb259IGNyZWF0ZVxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xudmFyIHN1YnNjcmliZU5vZGUgPSBmdW5jdGlvbiAoZm4sIGNyZWF0ZSkge1xuICByZXR1cm4gc3Vic2NyaWJlLmNhbGwodGhpcywgZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBVdGlscy50cmFja05vZGUoY3JlYXRlKHZhbHVlKSk7XG4gIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMudmFsdWUucmVwbGFjZShjcmVhdGUodmFsdWUpKTtcbiAgfSkudmFsdWUuZnJhZ21lbnQ7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbiBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuIFRoaXMgbWV0aG9kIHJlcXVpcmVzIGFcbiAqIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBhbnkgZWxlbWVudCBjaGFuZ2VzIHNpbmNlIHlvdSBjYW4ndCBjaGFuZ2UgYSB0YWdcbiAqIG5hbWUgaW4gcGxhY2UuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKi9cbnZhciBjcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKGZuLCBjYikge1xuICByZXR1cm4gc3Vic2NyaWJlLmNhbGwodGhpcywgZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBWTS5jcmVhdGVFbGVtZW50KHZhbHVlKTtcbiAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgY2IodGhpcy52YWx1ZSA9IFZNLnNldFRhZ05hbWUodGhpcy52YWx1ZSwgdmFsdWUpKTtcbiAgfSkudmFsdWU7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBlbGVtZW50IHRvIHRoZSBlbmQgb2YgYW5vdGhlciBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gcGFyZW50XG4gKiBAcGFyYW0ge05vZGV9IGNoaWxkXG4gKi9cbnZhciBhcHBlbmRDaGlsZCA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkKSB7XG4gIC8vIENhdGNoIGVycm9ycyB0aGF0IG9jY3VyIGZyb20gdHJ5aW5nIHRvIGFwcGVuZCBjb250ZW50IHRvIGEgdm9pZCBlbGVtZW50LlxuICB0cnkge1xuICAgIGNoaWxkICYmIHBhcmVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gIH0gY2F0Y2ggKGUpIHt9XG59O1xuXG4vKipcbiAqIFNldCBhbiBlbGVtZW50cyBhdHRyaWJ1dGUuIFdlIGFjY2VwdCB0aGUgY3VycmVudCBlbGVtZW50IGEgZnVuY3Rpb25cbiAqIGJlY2F1c2Ugd2hlbiBhIHRhZyBuYW1lIGNoYW5nZXMgd2Ugd2lsbCBsb3NlIHJlZmVyZW5jZSB0byB0aGUgYWN0aXZlbHlcbiAqIHJlbmRlcmVkIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY3VycmVudEVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBuYW1lRm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHZhbHVlRm5cbiAqL1xudmFyIHNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChjdXJyZW50RWwsIG5hbWVGbiwgdmFsdWVGbikge1xuICB2YXIgYXR0ck5hbWUgPSBzdWJzY3JpYmUuY2FsbCh0aGlzLCBuYW1lRm4sIG51bGwsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIFZNLnJlbW92ZUF0dHJpYnV0ZShjdXJyZW50RWwoKSwgdGhpcy52YWx1ZSk7XG4gICAgVk0uc2V0QXR0cmlidXRlKGN1cnJlbnRFbCgpLCB0aGlzLnZhbHVlID0gdmFsdWUsIGF0dHJWYWx1ZS52YWx1ZSk7XG4gIH0pO1xuXG4gIHZhciBhdHRyVmFsdWUgPSBzdWJzY3JpYmUuY2FsbCh0aGlzLCB2YWx1ZUZuLCBudWxsLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBWTS5zZXRBdHRyaWJ1dGUoY3VycmVudEVsKCksIGF0dHJOYW1lLnZhbHVlLCB0aGlzLnZhbHVlID0gdmFsdWUpO1xuICB9KTtcblxuICByZXR1cm4gVk0uc2V0QXR0cmlidXRlKGN1cnJlbnRFbCgpLCBhdHRyTmFtZS52YWx1ZSwgYXR0clZhbHVlLnZhbHVlKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgRE9NIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cbnZhciBjcmVhdGVET00gPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIHN1YnNjcmliZU5vZGUuY2FsbCh0aGlzLCBmbiwgVXRpbHMuZG9taWZ5RXhwcmVzc2lvbik7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIHRleHQgbm9kZSBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7VGV4dH1cbiAqL1xudmFyIGNyZWF0ZVRleHQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIHN1YnNjcmliZU5vZGUuY2FsbCh0aGlzLCBmbiwgVXRpbHMudGV4dGlmeUV4cHJlc3Npb24pO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0NvbW1lbnR9XG4gKi9cbnZhciBjcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKGZuKSB7XG4gIHJldHVybiBzdWJzY3JpYmUuY2FsbCh0aGlzLCBmbiwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIFZNLmNyZWF0ZUNvbW1lbnQodmFsdWUpO1xuICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB0aGlzLnZhbHVlLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH0pLnZhbHVlO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYW5kIHJldHVybiBhIHByb2dyYW0gc2luZ2xldG9uIGJhc2VkIG9uIGluZGV4LlxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gICBpXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBkYXRhXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xudmFyIHByb2dyYW0gPSBmdW5jdGlvbiAoaSwgZm4sIGRhdGEpIHtcbiAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcblxuICBpZiAoZGF0YSkge1xuICAgIHJldHVybiBWTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgfVxuXG4gIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtc1tpXSA9IFZNLnByb2dyYW0oaSwgZm4pO1xuICB9XG5cbiAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xufTtcblxuLyoqXG4gKiBNZXJnZSB0d28gb2JqZWN0cyBpbnRvIGEgc2luZ2xlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtXG4gKiBAcGFyYW0gIHtPYmplY3R9IGNvbW1vblxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG52YXIgbWVyZ2UgPSBmdW5jdGlvbiAocGFyYW0sIGNvbW1vbikge1xuICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgcmV0ID0ge307XG4gICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufTtcblxuLyoqXG4gKiBHZXQgYSBwcm9wZXJ0eSBmcm9tIGFuIG9iamVjdC4gUGFzc2VzIGluIHRoZSBvYmplY3QgaWQgKGRlcHRoKSB0byBtYWtlIGl0XG4gKiBtdWNoIGZhc3RlciB0byBkbyBjb21wYXJpc29ucyBiZXR3ZWVuIG5ldyBhbmQgb2xkIHN1YnNjcmlwdGlvbnMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAqIEBwYXJhbSAge1N0cmluZ30gaWRcbiAqIEByZXR1cm4geyp9XG4gKi9cbnZhciBnZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgdGhpcy5zdWJzY3JpcHRpb24uc3Vic2NyaWJlKG9iamVjdCwgcHJvcGVydHksIGlkKTtcbiAgcmV0dXJuIHRoaXMuX2dldChvYmplY3QsIHByb3BlcnR5KTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgYW4gZXhlY3V0YWJsZSB0ZW1wbGF0ZSBmcm9tIGEgdGVtcGxhdGUgc3BlYy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgdGVtcGxhdGVTcGVjXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVk0udGVtcGxhdGUgPSBmdW5jdGlvbiAodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyoqXG4gICAqIFRoZSBjb250YWluZXIgb2JqZWN0IGhvbGRzIGFsbCB0aGUgZnVuY3Rpb25zIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHNwZWMuXG4gICAqXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGludm9rZVBhcnRpYWw6ICAgIFZNLmludm9rZVBhcnRpYWwsXG4gICAgcHJvZ3JhbXM6ICAgICAgICAgW10sXG4gICAgbm9vcDogICAgICAgICAgICAgVk0ubm9vcCxcbiAgICBwYXJ0aWFsOiAgICAgICAgICBVdGlscy5wYXJ0aWFsLFxuICAgIHdyYXBQcm9ncmFtOiAgICAgIHdyYXBQcm9ncmFtLFxuICAgIGdldDogICAgICAgICAgICAgIGdldCxcbiAgICBtZXJnZTogICAgICAgICAgICBtZXJnZSxcbiAgICBwcm9ncmFtOiAgICAgICAgICBwcm9ncmFtLFxuICAgIGNyZWF0ZURPTTogICAgICAgIGNyZWF0ZURPTSxcbiAgICBjcmVhdGVUZXh0OiAgICAgICBjcmVhdGVUZXh0LFxuICAgIGNyZWF0ZUNvbW1lbnQ6ICAgIGNyZWF0ZUNvbW1lbnQsXG4gICAgY3JlYXRlRWxlbWVudDogICAgY3JlYXRlRWxlbWVudCxcbiAgICBhcHBlbmRDaGlsZDogICAgICBhcHBlbmRDaGlsZCxcbiAgICBzZXRBdHRyaWJ1dGU6ICAgICBzZXRBdHRyaWJ1dGUsXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBWTS5wcm9ncmFtV2l0aERlcHRoXG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICByZXR1cm4gZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52O1xuICAgIHZhciBoZWxwZXJzLCBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzICA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBjdXN0b20gY29udGFpbmVyIGZvciBlYWNoIGV4ZWN1dGlvbi5cbiAgICB2YXIgY29udGFpbm1lbnQgPSB7fTtcblxuICAgIC8vIEFsbG93cyBjdXN0b20gc3Vic2NyaXB0aW9uIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRocm91Z2ggZWFjaCB0aW1lLlxuICAgIFV0aWxzLmV4dGVuZChjb250YWlubWVudCwgY29udGFpbmVyKTtcbiAgICBjb250YWlubWVudC5fZ2V0ICAgICAgICAgPSBvcHRpb25zLmdldCAgICAgICAgIHx8IGVudi5nZXQ7XG4gICAgY29udGFpbm1lbnQuX3N1YnNjcmliZSAgID0gb3B0aW9ucy5zdWJzY3JpYmUgICB8fCBlbnYuc3Vic2NyaWJlO1xuICAgIGNvbnRhaW5tZW50Ll91bnN1YnNjcmliZSA9IG9wdGlvbnMudW5zdWJzY3JpYmUgfHwgZW52LnVuc3Vic2NyaWJlO1xuXG4gICAgdmFyIHJlc3VsdCA9IHdyYXBQcm9ncmFtLmNhbGwoY29udGFpbm1lbnQsIHRlbXBsYXRlU3BlYykuY2FsbChcbiAgICAgIGNvbnRhaW5tZW50LFxuICAgICAgbmFtZXNwYWNlLFxuICAgICAgY29udGV4dCxcbiAgICAgIGhlbHBlcnMsXG4gICAgICBwYXJ0aWFscyxcbiAgICAgIG9wdGlvbnMuZGF0YVxuICAgICk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbm1lbnQuY29tcGlsZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcbiAgJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9zYWZlLXN0cmluZydcbilbJ2RlZmF1bHQnXTtcbiIsInZhciBUcmFja05vZGUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMuZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgLy8gSW5zdGFudGx5IGFwcGVuZCBhIGJlZm9yZSBhbmQgYWZ0ZXIgdHJhY2tpbmcgbm9kZS5cbiAgdGhpcy5iZWZvcmUgPSB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG4gIHRoaXMuYWZ0ZXIgID0gdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuXG4gIC8vIEFwcGVuZCB0aGUgcGFzc2VkIGluIG5vZGUgdG8gdGhlIGN1cnJlbnQgZnJhZ21lbnQuXG4gIG5vZGUgJiYgdGhpcy5hcHBlbmRDaGlsZChub2RlKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGEgbm9kZSB0byB0aGUgY3VycmVudCB0cmFja2luZyBmcmFnbWVudC5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5hZnRlci5wYXJlbnROb2RlICYmIHRoaXMuYWZ0ZXIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5hZnRlcik7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByZXBlbmQgYSBub2RlIHRvIHRoZSBjdXJyZW50IHRyYWNraW5nIGZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucHJlcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5iZWZvcmUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGVsZW1lbnRzIGJldHdlZW4gdGhlIHR3byB0cmFja2luZyBub2Rlcy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICB3aGlsZSAodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcgJiYgdGhpcy5iZWZvcmUubmV4dFNpYmxpbmcgIT09IHRoaXMuYWZ0ZXIpIHtcbiAgICB0aGlzLmJlZm9yZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHRoZSBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gIHdoaWxlICh0aGlzLmJlZm9yZS5uZXh0U2libGluZyAmJiB0aGlzLmJlZm9yZS5uZXh0U2libGluZyAhPT0gdGhpcy5hZnRlcikge1xuICAgIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgLy8gUHVsbCB0aGUgdHdvIHJlZmVyZW5jZSBub2RlcyBvdXQgb2YgdGhlIERPTSBhbmQgaW50byB0aGUgZnJhZ21lbnQuXG4gIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5hZnRlcik7XG4gIHRoaXMuZnJhZ21lbnQuaW5zZXJ0QmVmb3JlKHRoaXMuYmVmb3JlLCB0aGlzLmZyYWdtZW50LmZpcnN0Q2hpbGQpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlIHRoZSBjb250ZW50cyBvZiB0aGUgdHJhY2tpbmcgbm9kZSB3aXRoIG5ldyBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbiAobm9kZSkge1xuICByZXR1cm4gdGhpcy5lbXB0eSgpLmFwcGVuZENoaWxkKG5vZGUpO1xufTtcbiIsInZhciBoYnNVdGlscyAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzJyk7XG52YXIgdW5pcXVlSWQgICA9IDA7XG52YXIgVHJhY2tOb2RlICA9IHJlcXVpcmUoJy4vdHJhY2stbm9kZScpO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKCcuL3NhZmUtc3RyaW5nJyk7XG52YXIgX19zbGljZSAgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBTaW1wbGUgd2F5IHRvIHN1YmNsYXNzIGFuIG9iamVjdCwgd2l0aCBzdXBwb3J0IGZvciBvbGRlciBicm93c2Vycy5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IChmdW5jdGlvbiAoKSB7XG4gIHZhciBGID0gZnVuY3Rpb24gKCkge307XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChvKSB7XG4gICAgRi5wcm90b3R5cGUgPSBvO1xuICAgIHZhciBvYmogPSBuZXcgRigpO1xuICAgIEYucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xufSkoKTtcblxuLyoqXG4gKiBFeHRlbmQgSGFuZGxlYmFycyB1dGlsaXRpZXMgd2l0aCBET00gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgVXRpbHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZShoYnNVdGlscyk7XG5cbi8qKlxuICogUmV0dXJuIGEgdW5pcXVlIGlkLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVXRpbHMudW5pcXVlSWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB1bmlxdWVJZCsrO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgYW4gdW5saW1pdGVkIG51bWJlciBvZiBhcmd1bWVudHMgYXMgdGhlIGxhc3RcbiAqIGFyZ3VtZW50LlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblV0aWxzLnZhcmlhZGljID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBjb3VudCA9IE1hdGgubWF4KGZuLmxlbmd0aCAtIDEsIDApO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwLCBjb3VudCk7XG5cbiAgICAvLyBFbmZvcmNlIHRoZSBhcnJheSBsZW5ndGgsIGluIGNhc2Ugd2UgZGlkbid0IGhhdmUgZW5vdWdoIGFyZ3VtZW50cy5cbiAgICBhcmdzLmxlbmd0aCA9IGNvdW50O1xuICAgIGFyZ3MucHVzaChfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCBjb3VudCkpO1xuXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9O1xufTtcblxuLyoqXG4gKiBTaW1wbGUgcGFydGlhbCBhcHBsaWNhdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAgeyp9ICAgICAgICAuLi5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5VdGlscy5wYXJ0aWFsID0gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGZuLCBhcmdzKSB7XG4gIHJldHVybiBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAoY2FsbGVkKSB7XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KGNhbGxlZCkpO1xuICB9KTtcbn0pO1xuXG4vKipcbiAqIEJpbmQgYSBmdW5jdGlvbiB0byBhIGNlcnRhaW4gY29udGV4dC5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcGFyYW0gIHsqfSAgICAgICAgLi4uXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVXRpbHMuYmluZCA9IFV0aWxzLnZhcmlhZGljKGZ1bmN0aW9uIChmbiwgY29udGV4dCwgYXJncykge1xuICByZXR1cm4gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGNhbGxlZCkge1xuICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChjYWxsZWQpKTtcbiAgfSk7XG59KTtcblxuLyoqXG4gKiBFeHBvc2UgdGhlIGNyZWF0ZSBmdW5jdGlvbi5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblV0aWxzLmNyZWF0ZSA9IGNyZWF0ZTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIG9iamVjdCBpcyBhY3R1YWxseSBhIERPTSBub2RlLlxuICpcbiAqIEBwYXJhbSAgeyp9ICAgICAgIG9cbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblV0aWxzLmlzTm9kZSA9IGZ1bmN0aW9uIChvKSB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgby5vd25lckRvY3VtZW50ID09PSB3aW5kb3cuZG9jdW1lbnQ7XG59O1xuXG4vKipcbiAqIFRyYWNrIGEgbm9kZSBpbnN0YW5jZSBhbnl3aGVyZSBpdCBnb2VzIGluIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gICAgICBub2RlXG4gKiBAcmV0dXJuIHtUcmFja05vZGV9XG4gKi9cblV0aWxzLnRyYWNrTm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHJldHVybiBuZXcgVHJhY2tOb2RlKG5vZGUpO1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhcmJpdHJhcnkgRE9NIG5vZGVzLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5VdGlscy5kb21pZnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKHN0cmluZykge1xuICAvLyBJZiB3ZSBwYXNzZWQgaW4gYSBzYWZlIHN0cmluZywgZ2V0IHRoZSBhY3R1YWwgdmFsdWUuXG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgc3RyaW5nID0gc3RyaW5nLnN0cmluZztcbiAgfVxuXG4gIC8vIE5vIG5lZWQgdG8gY29lcmNlIGEgbm9kZS5cbiAgaWYgKFV0aWxzLmlzTm9kZShzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZztcbiAgfVxuXG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZGl2LmlubmVySFRNTCA9IHN0cmluZztcblxuICBpZiAoZGl2LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGRpdi5yZW1vdmVDaGlsZChkaXYuY2hpbGROb2Rlc1swXSk7XG4gIH1cblxuICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgd2hpbGUgKGRpdi5maXJzdENoaWxkKSB7XG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICB9XG5cbiAgcmV0dXJuIGZyYWdtZW50O1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhIERPTSB0ZXh0IG5vZGUgZm9yIGFwcGVuZGluZyB0byB0aGUgdGVtcGxhdGUuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1RleHR9XG4gKi9cblV0aWxzLnRleHRpZnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKHN0cmluZykge1xuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBVdGlscy5kb21pZnlFeHByZXNzaW9uKHN0cmluZy5zdHJpbmcpO1xuICB9XG5cbiAgLy8gQ2F0Y2ggd2hlbiB0aGUgc3RyaW5nIGlzIGFjdHVhbGx5IGEgRE9NIG5vZGUgYW5kIHR1cm4gaXQgaW50byBhIHN0cmluZy5cbiAgaWYgKFV0aWxzLmlzTm9kZShzdHJpbmcpKSB7XG4gICAgLy8gQWxyZWFkeSBhIHRleHQgbm9kZSwganVzdCByZXR1cm4gaXQgaW1tZWRpYXRlbHkuXG4gICAgaWYgKHN0cmluZy5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN0cmluZy5vdXRlckhUTUwgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nLm91dGVySFRNTCk7XG4gICAgfVxuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5hcHBlbmRDaGlsZChzdHJpbmcuY2xvbmVOb2RlKHRydWUpKTtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGl2LmlubmVySFRNTCk7XG4gIH1cblxuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nID09IG51bGwgPyAnJyA6IHN0cmluZyk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgVkVSU0lPTiA9IFwiMS4zLjBcIjtcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047dmFyIENPTVBJTEVSX1JFVklTSU9OID0gNDtcbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7SGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IChjb250ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYoZGF0YSkgeyBcbiAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7IFxuICAgICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSAwKXtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBjb250ZXh0KTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMyxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xuZnVuY3Rpb24gbG9nKGxldmVsLCBvYmopIHsgbG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfVxuXG5leHBvcnRzLmxvZyA9IGxvZzt2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBVdGlscy5leHRlbmQob2JqLCBvYmplY3QpO1xuICByZXR1cm4gb2JqO1xufTtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICB2YXIgbGluZTtcbiAgaWYgKG5vZGUgJiYgbm9kZS5maXJzdExpbmUpIHtcbiAgICBsaW5lID0gbm9kZS5maXJzdExpbmU7XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cblxuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgaWYgKGxpbmUpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gbm9kZS5maXJzdENvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gRXhjZXB0aW9uOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247Ly8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlXCIpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgdmFyIGludm9rZVBhcnRpYWxXcmFwcGVyID0gZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHsgcmV0dXJuIHJlc3VsdDsgfVxuXG4gICAgaWYgKGVudi5jb21waWxlKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHsgZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkIH0sIGVudik7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH1cbiAgfTtcblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgaWYoZGF0YSkge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbShpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgICAgcmV0ID0ge307XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBlbnYuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IG51bGxcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52LFxuICAgICAgICBoZWxwZXJzLFxuICAgICAgICBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICAgICAgY29udGFpbmVyLFxuICAgICAgICAgIG5hbWVzcGFjZSwgY29udGV4dCxcbiAgICAgICAgICBoZWxwZXJzLFxuICAgICAgICAgIHBhcnRpYWxzLFxuICAgICAgICAgIG9wdGlvbnMuZGF0YSk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbmVyLmNvbXBpbGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW1XaXRoRGVwdGgoaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW1XaXRoRGVwdGggPSBwcm9ncmFtV2l0aERlcHRoO2Z1bmN0aW9uIHByb2dyYW0oaSwgZm4sIGRhdGEpIHtcbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbSA9IHByb2dyYW07ZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuZXhwb3J0cy5ub29wID0gbm9vcDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmosIHZhbHVlKSB7XG4gIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrZXkpKSB7XG4gICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO3ZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmICghc3RyaW5nICYmIHN0cmluZyAhPT0gMCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTsiXX0=
(1)
});
