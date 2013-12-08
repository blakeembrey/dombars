!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.DOMBars=e():"undefined"!=typeof global?global.DOMBars=e():"undefined"!=typeof self&&(self.DOMBars=e())}(function(){var define,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var base = require('handlebars/lib/handlebars/base');

exports.create = function () {
  var DOMBars = base.create.apply(this, arguments);

  /**
   * Noop functions for subscribe and unsubscribe. Implement your own function.
   */
  DOMBars.subscribe = DOMBars.unsubscribe = function () {};

  /**
   * Basic getter function. Attach this however you want it to work.
   *
   * @param  {Object} object
   * @param  {String} property
   * @return {*}
   */
  DOMBars.get = function (object, property) {
    return object[property];
  };

  /**
   * Handlebars `each` helper is incompatibable with DOMBars, since it assumes
   * strings (as opposed to document fragments).
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  DOMBars.registerHelper('each', function (context, options) {
    var fn      = options.fn;
    var inverse = options.inverse;
    var buffer  = document.createDocumentFragment();
    var i       = 0;
    var data;

    if (typeof context === 'function') {
      context = context.call(this);
    }

    if (options.data) {
      data = DOMBars.createFrame(options.data);
    }

    if (typeof context === 'object') {
      var len = context.length;

      if (len === +len) {
        for (; i < len; i++) {
          if (data) { data.index = i; }
          buffer.appendChild(fn(context[i], { data: data }));
        }
      } else {
        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            i += 1;
            if (data) { data.key = key; }
            buffer.appendChild(fn(context[key], { data: data }));
          }
        }
      }
    }

    if (i === 0) {
      return inverse(this);
    }

    return buffer;
  });

  return DOMBars;
};


},{"handlebars/lib/handlebars/base":5}],2:[function(require,module,exports){
var Events = module.exports = {};

/**
 * Listen to any events triggered.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.on = function (name, fn, context) {
  this._events || (this._events = {});
  var events = this._events[name] || (this._events[name] = []);
  events.push({ fn: fn, context: context });
  return this;
};

/**
 * Listen to any events triggered once.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.once = function (name, fn, context) {
  var that = this;

  return this.on(name, function self () {
    that.off(name, self);
    fn.apply(this, arguments);
  }, context);
};

/**
 * Remove an event listener.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.off = function (name, fn, context) {
  if (!this._events || !this._events[name]) {
    return this;
  }

  if (arguments.length < 2) {
    if (!name) {
      delete this._events;
    } else {
      delete this._events[name];
    }

    return this;
  }

  var events = this._events[name];
  for (var i = 0; i < events.length; i++) {
    if (events[i].fn === fn) {
      if (arguments.length === 2 || events[i].context === context) {
        events.splice(i, 1);
        i--;
      }
    }
  }

  if (!events.length) {
    delete this._events[name];
  }

  return this;
};

/**
 * Emit an event.
 *
 * @param  {String} name
 * @param  {*}      ...
 * @return {Events}
 */
Events.emit = function (name /*, ...args */) {
  var args   = Array.prototype.slice.call(arguments, 1);
  var events = this._events && this._events[name] && this._events[name].slice();

  if (events) {
    for (var i = 0; i < events.length; i++) {
      events[i].fn.apply(events[i].context, args);
    }
  }

  return this;
};

},{}],3:[function(require,module,exports){
var runtime = require('handlebars/lib/handlebars/runtime');
var browser = typeof window !== 'undefined';
var raf     = browser && require('raf-component');

/**
 * Attribute runtime features to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  var VM    = runtime.attach(DOMBars).VM;
  var Utils = DOMBars.Utils;

  /**
   * Bind a function to the animation frame.
   *
   * @param  {Function} fn
   * @return {Number}
   */
  VM.exec = function (fn) {
    return browser ? raf(fn) : setImmediate(fn);
  };

  /**
   * Cancel an execution.
   *
   * @param {Number} id
   */
  VM.exec.cancel = function (id) {
    return browser ? raf.cancel(id) : clearImmediate(id);
  };

  /**
   * Accepts a function that has subscriptions called inside and returns a new
   * function that will listen to all subscriptions and can update with any
   * changes.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  VM.subscribe = function (fn) {
    /**
     * The returned subscription function takes care of aliasing the
     * subscriptions array correctly, subscribing for updates and triggering
     * updates when any of the subscriptions change.
     *
     * @return {*}
     */
    var subscriber = function () {
      var result = subscriber.exec.apply(this, arguments);
      eachSubscription(subscriber.subscriptions, DOMBars.subscribe);
      return result;
    };

    // Keep an array of current subscriptions and an object with references
    // to child subscription functions.
    subscriber.cid      = 'subscriber' + Utils.uniqueId();
    subscriber.children = {};

    /**
     * Trigger this function with every change with the listeners.
     */
    var change = function () {
      // If the triggered flag has been set, don't cause another update.
      if (subscriber.triggered) { return; }

      // Set a triggered flag to avoid multiple triggers. Also unsubscribe any
      // children immediately to stop update clashes.
      subscriber.triggered = true;
      subscriber.unsubscribeChildren();

      subscriber._exec = VM.exec(function () {
        subscriber.beforeUpdate();
        subscriber.update(subscriber.exec());
        subscriber.afterUpdate();
        delete subscriber.triggered;
      });
    };

    /**
     * Iterate over a subscriptions object and unsubscribe everything.
     *
     * @param {Array} subscriptions
     */
    var eachSubscription = function (subscriptions, fn) {
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          fn(subscriptions[property][key], property, change);
        }
      }
    };

    /**
     * Iterate over an array of functions and execute.
     *
     * @param {Array} subscriptions
     */
    var iteration = function (subscriptions) {
      for (var i = 0; i < subscriptions.length; i++) {
        subscriptions[i]();
      }
    };

    /**
     * Execute the function and return the result.
     *
     * @return {*}
     */
    subscriber.exec = function () {
      // If we have a parent subscriber, link the subscribers together.
      if (VM.subscriber) {
        subscriber.parent = VM.subscriber;
        VM.subscriber.children[subscriber.cid] = subscriber;
      }

      // Alias subscriber functionality to the VM object.
      VM.subscriber  = subscriber;
      VM.unsubscribe = function (fn) {
        subscriber.unsubscriptions.push(fn);
      };

      // Reset subscriptions before execution.
      subscriber.subscriptions   = {};
      subscriber.unsubscriptions = [];

      var result = fn.apply(this, arguments);

      // Reset the VM functionality to what it was beforehand.
      VM.subscriber  = subscriber.parent;
      VM.unsubscribe = null;

      return result;
    };

    /**
     * Run this function before we run an update function. This is required
     * since we don't want to run unsubscriptions until after the render update.
     */
    subscriber.beforeUpdate = function () {
      iteration(subscriber.unsubscriptions);
      subscriber.prevSubscriptions = subscriber.subscriptions;
    };

    /**
     * Run this function after an update. It will check for difference in the
     * before and after updates.
     */
    subscriber.afterUpdate = function () {
      var subscriptions = subscriber.subscriptions;

      // Diff the previous subscriptions and new subscriptions to add/remove
      // listeners as needed. This should be more memory efficient than blindly
      // adding and removing listeners every time.
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          if (!subscriber.prevSubscriptions[property][key]) {
            DOMBars.subscribe(subscriptions[property][key], property, change);
          } else {
            delete subscriber.prevSubscriptions[property][key];
          }
        }
      }

      // Loop over previous subscriptions that no longer exist and unsubscribe.
      eachSubscription(subscriber.prevSubscriptions, DOMBars.unsubscribe);

      delete subscriber.prevSubscriptions;
    };

    /**
     * Remove the current subscriber from all listeners. We also need to cancel
     * any current execution event and remove a reference from the parent
     * subscription.
     */
    subscriber.unsubscribe = function () {
      VM.exec.cancel(subscriber._exec);
      iteration(subscriber.unsubscriptions);
      eachSubscription(subscriber.subscriptions, DOMBars.unsubscribe);

      if (subscriber.parent) {
        delete subscriber.parent.children[subscriber.cid];
        delete subscriber.parent;
      }

      subscriber.unsubscribeChildren();
    };

    subscriber.unsubscribeChildren = function () {
      for (var child in subscriber.children) {
        subscriber.children[child].unsubscribe();
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
    var subscription = VM.subscribe(fn);

    // We need to add a before and after element placeholder since the pieces
    // in between can be enabled and disabled randomly.
    var placeholder = {
      after:  document.createTextNode(''),
      before: document.createTextNode('')
    };

    // Create a function to keep track of document fragment children.
    var generate = function (text) {
      var fragment = document.createDocumentFragment();

      // To keep track of the insertions and deletions accurately we need to
      // add placeholder DOM elements.
      fragment.appendChild(placeholder.before);
      fragment.appendChild(create(text));
      fragment.appendChild(placeholder.after);

      return fragment;
    };

    subscription.update = function (value) {
      var parentNode = placeholder.before.parentNode;
      var childNodes = parentNode.childNodes;

      // Iterate over the child nodes to remove the attached children.
      for (var i = 0; i < parentNode.childNodes.length; i++) {
        // When we find the `before` placeholder node, start removing all
        // the child nodes until we hit the `after` placeholder node.
        if (childNodes[i] === placeholder.before) {
          do {
            parentNode.removeChild(childNodes[i]);
          } while (childNodes[i] !== placeholder.after);

          var nextSibling = placeholder.after.nextSibling;
          parentNode.insertBefore(generate(value), nextSibling);
          break;
        }
      }
    };

    return generate(subscription());
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
  VM.createElement = function (fn, cb) {
    var subscription = VM.subscribe(fn);
    var el           = Utils.createElement(subscription());

    subscription.update = function (value) {
      cb(el = Utils.copyAndReplaceNode(Utils.createElement(value), el));
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
  VM.setAttribute = function (elementFn, nameFn, valueFn) {
    var nameSubscription  = VM.subscribe(nameFn);
    var valueSubscription = VM.subscribe(valueFn);

    // Keep track of the current name and value without having to re-run the
    // function every time something changes.
    var attrName  = nameSubscription();
    var attrValue = valueSubscription();

    nameSubscription.update = function (value) {
      Utils.removeAttribute(elementFn(), attrName);
      Utils.setAttribute(elementFn(), attrName = value, attrValue);
    };

    valueSubscription.update = function (value) {
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
  VM.createDOM = function (fn) {
    return subscribeNode(fn, Utils.domifyExpression);
  };

  /**
   * Create a text node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Text}
   */
  VM.createText = function (fn) {
    return subscribeNode(fn, Utils.textifyExpression);
  };

  /**
   * Create a comment node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Comment}
   */
  VM.createComment = function (fn) {
    var subscription = VM.subscribe(fn);
    var node         = Utils.createComment(subscription());

    subscription.update = function (value) {
      node.textContent = value;
    };

    return node;
  };

  /**
   * Generate an executable template from a template spec.
   *
   * @param  {Object}   templateSpec
   * @return {Function}
   */
  VM.template = DOMBars.template = function (templateSpec) {
    var DOMBars = this;

    /**
     * The container object holds all the functions used by the template spec.
     *
     * @type {Object}
     */
    var container = {
      invokePartial:    VM.invokePartial,
      programs:         [],
      noop:             VM.noop,
      compilerInfo:     null,
      appendChild:      Utils.appendChild,
      createDOM:        VM.createDOM,
      createText:       VM.createText,
      setAttribute:     VM.setAttribute,
      createComment:    VM.createComment,
      createElement:    VM.createElement,
      escapeExpression: Utils.escapeExpression,
      programWithDepth: VM.programWithDepth
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
    container.merge = function (param, common) {
      var ret = param || common;

      if (param && common) {
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
      var subscriptions = VM.subscriber.subscriptions;

      (subscriptions[property] || (subscriptions[property] = {}))[id] = object;

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

      // Subscribe to the template spec inside the returned function. This is so
      // that *every* generated DOM template will have a different unsubscribe
      // method.
      var subscriber = VM.subscribe(templateSpec);

      var result = subscriber.call(
        container,
        DOMBars,
        context,
        options.helpers,
        options.partials,
        options.data
      );

      // Attach the current operating context to the VM object for reference
      // within the utility functions.
      VM.context = context;

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

      VM.context = null;

      return result;
    };
  };

  return DOMBars;
};

},{"handlebars/lib/handlebars/runtime":6,"raf-component":8}],4:[function(require,module,exports){
var utils    = require('handlebars/lib/handlebars/utils');
var events   = require('./compiler/events');
var uniqueId = 0;

/**
 * Attach reusable utility functions to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  var Utils = utils.attach(DOMBars).Utils;

  // Extend the DOMBars root object with an event emitter.
  DOMBars.Utils.extend(DOMBars, events);

  /**
   * Simple function wrapper that will emit the event with the result of the
   * function execution every time the function is run.
   *
   * @param  {Function} fn
   * @param  {String}   event
   * @return {Function}
   */
  var emitter = function (fn, event) {
    return function () {
      var result = fn.apply(this, arguments);
      DOMBars.emit(event, result);
      return result;
    };
  };

  /**
   * Return a unique id.
   *
   * @return {Number}
   */
  Utils.uniqueId = function () {
    return uniqueId++;
  };

  /**
   * Check whether an object is actually a DOM node.
   *
   * @param  {*}       element
   * @return {Boolean}
   */
  Utils.isNode = function (element) {
    return element instanceof Node;
  };

  /**
   * Create an element from a tag name.
   *
   * @param  {String} tagName
   * @return {Node}
   */
  Utils.createElement = emitter(function (tagName) {
    return document.createElement(tagName);
  }, 'createElement');

  /**
   * Create a comment node based on text contents.
   *
   * @param  {String} contents
   * @return {Node}
   */
  Utils.createComment = emitter(function (contents) {
    return document.createComment(contents);
  }, 'createComment');

  /**
   * Copy all significant data from one element node to another.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  Utils.copyNode = function (newNode, oldNode) {
    // Move all child elements to the new node.
    while (oldNode.firstChild) {
      newNode.appendChild(oldNode.firstChild);
    }

    // Copy all the attributes to the new node.
    for (var i = 0; i < oldNode.attributes.length; i++) {
      var attribute = oldNode.attributes[i];
      Utils.setAttribute(newNode, attribute.name, attribute.value);
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
  Utils.copyAndReplaceNode = function (newNode, oldNode) {
    oldNode.parentNode.replaceChild(Utils.copyNode(newNode, oldNode), oldNode);
    return newNode;
  };

  /**
   * Set an attribute value on an element.
   *
   * @param {Node}   element
   * @param {String} name
   * @param {*}      value
   */
  Utils.setAttribute = function (element, name, value) {
    if (value === false) {
      return Utils.removeAttribute(element, name);
    }

    DOMBars.emit('setAttribute', element, name, value);
    element.setAttribute(name, value);
  };

  /**
   * Remove an attribute from an element.
   *
   * @param {Node}   element
   * @param {String} name
   */
  Utils.removeAttribute = function (element, name) {
    if (element.hasAttribute(name)) {
      DOMBars.emit('removeAttribute', element, name);
      element.removeAttribute(name);
    }
  };

  /**
   * Append a child element to a DOM node.
   *
   * @param {Node} parent
   * @param {Node} child
   */
  Utils.appendChild = function (parent, child) {
    if (child == null) { return; }

    parent.appendChild(child);
    DOMBars.emit('appendChild', parent, child);
  };

  /**
   * Transform a string into arbitrary DOM nodes.
   *
   * @param  {String} string
   * @return {Node}
   */
  Utils.domifyExpression = emitter(function (string) {
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
  }, 'domify');

  /**
   * Transform a string into a DOM text node for appending to the template.
   *
   * @param  {String} string
   * @return {Text}
   */
  Utils.textifyExpression = emitter(function (string) {
    if (string instanceof DOMBars.SafeString) {
      return Utils.domifyExpression(string.toString());
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
  }, 'textify');

  return DOMBars;
};

},{"./compiler/events":2,"handlebars/lib/handlebars/utils":7}],5:[function(require,module,exports){
/*jshint eqnull: true */

module.exports.create = function() {

var Handlebars = {};

// BEGIN(BROWSER)

Handlebars.VERSION = "1.0.0";
Handlebars.COMPILER_REVISION = 4;

Handlebars.REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};

Handlebars.helpers  = {};
Handlebars.partials = {};

var toString = Object.prototype.toString,
    functionType = '[object Function]',
    objectType = '[object Object]';

Handlebars.registerHelper = function(name, fn, inverse) {
  if (toString.call(name) === objectType) {
    if (inverse || fn) { throw new Handlebars.Exception('Arg not supported with multiple helpers'); }
    Handlebars.Utils.extend(this.helpers, name);
  } else {
    if (inverse) { fn.not = inverse; }
    this.helpers[name] = fn;
  }
};

Handlebars.registerPartial = function(name, str) {
  if (toString.call(name) === objectType) {
    Handlebars.Utils.extend(this.partials,  name);
  } else {
    this.partials[name] = str;
  }
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Missing helper: '" + arg + "'");
  }
});

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;

  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      return Handlebars.helpers.each(context, options);
    } else {
      return inverse(this);
    }
  } else {
    return fn(context);
  }
});

Handlebars.K = function() {};

Handlebars.createFrame = Object.create || function(object) {
  Handlebars.K.prototype = object;
  var obj = new Handlebars.K();
  Handlebars.K.prototype = null;
  return obj;
};

Handlebars.logger = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3,

  methodMap: {0: 'debug', 1: 'info', 2: 'warn', 3: 'error'},

  // can be overridden in the host environment
  log: function(level, obj) {
    if (Handlebars.logger.level <= level) {
      var method = Handlebars.logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};

Handlebars.log = function(level, obj) { Handlebars.logger.log(level, obj); };

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var i = 0, ret = "", data;

  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && typeof context === 'object') {
    if(context instanceof Array){
      for(var j = context.length; i<j; i++) {
        if (data) { data.index = i; }
        ret = ret + fn(context[i], { data: data });
      }
    } else {
      for(var key in context) {
        if(context.hasOwnProperty(key)) {
          if(data) { data.key = key; }
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

Handlebars.registerHelper('if', function(conditional, options) {
  var type = toString.call(conditional);
  if(type === functionType) { conditional = conditional.call(this); }

  if(!conditional || Handlebars.Utils.isEmpty(conditional)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(conditional, options) {
  return Handlebars.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn});
});

Handlebars.registerHelper('with', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (!Handlebars.Utils.isEmpty(context)) return options.fn(context);
});

Handlebars.registerHelper('log', function(context, options) {
  var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
  Handlebars.log(level, context);
});

// END(BROWSER)

return Handlebars;
};

},{}],6:[function(require,module,exports){
exports.attach = function(Handlebars) {

// BEGIN(BROWSER)

Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = Handlebars.VM.program(i, fn, data);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = Handlebars.VM.program(i, fn);
        }
        return programWrapper;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common) {
          ret = {};
          Handlebars.Utils.extend(ret, common);
          Handlebars.Utils.extend(ret, param);
        }
        return ret;
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop,
      compilerInfo: null
    };

    return function(context, options) {
      options = options || {};
      var result = templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);

      var compilerInfo = container.compilerInfo || [],
          compilerRevision = compilerInfo[0] || 1,
          currentRevision = Handlebars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = Handlebars.REVISION_CHANGES[currentRevision],
              compilerVersions = Handlebars.REVISION_CHANGES[compilerRevision];
          throw "Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").";
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw "Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").";
        }
      }

      return result;
    };
  },

  programWithDepth: function(i, fn, data /*, $depth */) {
    var args = Array.prototype.slice.call(arguments, 3);

    var program = function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
    program.program = i;
    program.depth = args.length;
    return program;
  },
  program: function(i, fn, data) {
    var program = function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
    program.program = i;
    program.depth = 0;
    return program;
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    var options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial, {data: data !== undefined});
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;

// END(BROWSER)

return Handlebars;

};

},{}],7:[function(require,module,exports){
exports.attach = function(Handlebars) {

var toString = Object.prototype.toString;

// BEGIN(BROWSER)

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
};
Handlebars.Exception.prototype = new Error();

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

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

var escapeChar = function(chr) {
  return escape[chr] || "&amp;";
};

Handlebars.Utils = {
  extend: function(obj, value) {
    for(var key in value) {
      if(value.hasOwnProperty(key)) {
        obj[key] = value[key];
      }
    }
  },

  escapeExpression: function(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof Handlebars.SafeString) {
      return string.toString();
    } else if (string == null || string === false) {
      return "";
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = string.toString();

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  },

  isEmpty: function(value) {
    if (!value && value !== 0) {
      return true;
    } else if(toString.call(value) === "[object Array]" && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }
};

// END(BROWSER)

return Handlebars;
};

},{}],8:[function(require,module,exports){
/**
 * Expose `requestAnimationFrame()`.
 */

exports = module.exports = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || window.oRequestAnimationFrame
  || window.msRequestAnimationFrame
  || fallback;

/**
 * Fallback implementation.
 */

var prev = new Date().getTime();
function fallback(fn) {
  var curr = new Date().getTime();
  var ms = Math.max(0, 16 - (curr - prev));
  var req = setTimeout(fn, ms);
  prev = curr;
  return req;
}

/**
 * Cancel.
 */

var cancel = window.cancelAnimationFrame
  || window.webkitCancelAnimationFrame
  || window.mozCancelAnimationFrame
  || window.oCancelAnimationFrame
  || window.msCancelAnimationFrame
  || window.clearTimeout;

exports.cancel = function(id){
  cancel.call(window, id);
};

},{}],9:[function(require,module,exports){
var base     = require('./lib/base');
var utils    = require('./lib/utils');
var runtime  = require('./lib/runtime');

/**
 * Generate the base DOMBars object.
 *
 * @return {Object}
 */
module.exports = (function create () {
  var DOMBars = base.create();

  utils.attach(DOMBars);
  runtime.attach(DOMBars);

  DOMBars.create = create;

  return DOMBars;
})();

},{"./lib/base":1,"./lib/runtime":3,"./lib/utils":4}]},{},[9])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi91dGlscy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvcmFmLWNvbXBvbmVudC9pbmRleC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBiYXNlID0gcmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlJyk7XG5cbmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgRE9NQmFycyA9IGJhc2UuY3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLyoqXG4gICAqIE5vb3AgZnVuY3Rpb25zIGZvciBzdWJzY3JpYmUgYW5kIHVuc3Vic2NyaWJlLiBJbXBsZW1lbnQgeW91ciBvd24gZnVuY3Rpb24uXG4gICAqL1xuICBET01CYXJzLnN1YnNjcmliZSA9IERPTUJhcnMudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAvKipcbiAgICogQmFzaWMgZ2V0dGVyIGZ1bmN0aW9uLiBBdHRhY2ggdGhpcyBob3dldmVyIHlvdSB3YW50IGl0IHRvIHdvcmsuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHJldHVybiB7Kn1cbiAgICovXG4gIERPTUJhcnMuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICByZXR1cm4gb2JqZWN0W3Byb3BlcnR5XTtcbiAgfTtcblxuICAvKipcbiAgICogSGFuZGxlYmFycyBgZWFjaGAgaGVscGVyIGlzIGluY29tcGF0aWJhYmxlIHdpdGggRE9NQmFycywgc2luY2UgaXQgYXNzdW1lc1xuICAgKiBzdHJpbmdzIChhcyBvcHBvc2VkIHRvIGRvY3VtZW50IGZyYWdtZW50cykuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29udGV4dFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIERPTUJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiAgICAgID0gb3B0aW9ucy5mbjtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgICB2YXIgYnVmZmVyICA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB2YXIgaSAgICAgICA9IDA7XG4gICAgdmFyIGRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IERPTUJhcnMuY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgbGVuID0gY29udGV4dC5sZW5ndGg7XG5cbiAgICAgIGlmIChsZW4gPT09ICtsZW4pIHtcbiAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgICAgYnVmZmVyLmFwcGVuZENoaWxkKGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICAgIGJ1ZmZlci5hcHBlbmRDaGlsZChmbihjb250ZXh0W2tleV0sIHsgZGF0YTogZGF0YSB9KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiBidWZmZXI7XG4gIH0pO1xuXG4gIHJldHVybiBET01CYXJzO1xufTtcblxuIiwidmFyIEV2ZW50cyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8qKlxuICogTGlzdGVuIHRvIGFueSBldmVudHMgdHJpZ2dlcmVkLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vbiA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICBldmVudHMucHVzaCh7IGZuOiBmbiwgY29udGV4dDogY29udGV4dCB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIExpc3RlbiB0byBhbnkgZXZlbnRzIHRyaWdnZXJlZCBvbmNlLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vbmNlID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIHZhciB0aGF0ID0gdGhpcztcblxuICByZXR1cm4gdGhpcy5vbihuYW1lLCBmdW5jdGlvbiBzZWxmICgpIHtcbiAgICB0aGF0Lm9mZihuYW1lLCBzZWxmKTtcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LCBjb250ZXh0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGV2ZW50IGxpc3RlbmVyLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5vZmYgPSBmdW5jdGlvbiAobmFtZSwgZm4sIGNvbnRleHQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZXZlbnRzW2ldLmZuID09PSBmbikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgfHwgZXZlbnRzW2ldLmNvbnRleHQgPT09IGNvbnRleHQpIHtcbiAgICAgICAgZXZlbnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgaS0tO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICghZXZlbnRzLmxlbmd0aCkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW1pdCBhbiBldmVudC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSAgeyp9ICAgICAgLi4uXG4gKiBAcmV0dXJuIHtFdmVudHN9XG4gKi9cbkV2ZW50cy5lbWl0ID0gZnVuY3Rpb24gKG5hbWUgLyosIC4uLmFyZ3MgKi8pIHtcbiAgdmFyIGFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW25hbWVdICYmIHRoaXMuX2V2ZW50c1tuYW1lXS5zbGljZSgpO1xuXG4gIGlmIChldmVudHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgZXZlbnRzW2ldLmZuLmFwcGx5KGV2ZW50c1tpXS5jb250ZXh0LCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG4iLCJ2YXIgcnVudGltZSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZScpO1xudmFyIGJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJztcbnZhciByYWYgICAgID0gYnJvd3NlciAmJiByZXF1aXJlKCdyYWYtY29tcG9uZW50Jyk7XG5cbi8qKlxuICogQXR0cmlidXRlIHJ1bnRpbWUgZmVhdHVyZXMgdG8gdGhlIERPTUJhcnMgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBET01CYXJzXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24gKERPTUJhcnMpIHtcbiAgdmFyIFZNICAgID0gcnVudGltZS5hdHRhY2goRE9NQmFycykuVk07XG4gIHZhciBVdGlscyA9IERPTUJhcnMuVXRpbHM7XG5cbiAgLyoqXG4gICAqIEJpbmQgYSBmdW5jdGlvbiB0byB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7TnVtYmVyfVxuICAgKi9cbiAgVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBicm93c2VyID8gcmFmKGZuKSA6IHNldEltbWVkaWF0ZShmbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbmNlbCBhbiBleGVjdXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZFxuICAgKi9cbiAgVk0uZXhlYy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICByZXR1cm4gYnJvd3NlciA/IHJhZi5jYW5jZWwoaWQpIDogY2xlYXJJbW1lZGlhdGUoaWQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBoYXMgc3Vic2NyaXB0aW9ucyBjYWxsZWQgaW5zaWRlIGFuZCByZXR1cm5zIGEgbmV3XG4gICAqIGZ1bmN0aW9uIHRoYXQgd2lsbCBsaXN0ZW4gdG8gYWxsIHN1YnNjcmlwdGlvbnMgYW5kIGNhbiB1cGRhdGUgd2l0aCBhbnlcbiAgICogY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgVk0uc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgLyoqXG4gICAgICogVGhlIHJldHVybmVkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0YWtlcyBjYXJlIG9mIGFsaWFzaW5nIHRoZVxuICAgICAqIHN1YnNjcmlwdGlvbnMgYXJyYXkgY29ycmVjdGx5LCBzdWJzY3JpYmluZyBmb3IgdXBkYXRlcyBhbmQgdHJpZ2dlcmluZ1xuICAgICAqIHVwZGF0ZXMgd2hlbiBhbnkgb2YgdGhlIHN1YnNjcmlwdGlvbnMgY2hhbmdlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICB2YXIgc3Vic2NyaWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZXN1bHQgPSBzdWJzY3JpYmVyLmV4ZWMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zLCBET01CYXJzLnN1YnNjcmliZSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvLyBLZWVwIGFuIGFycmF5IG9mIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBhbmQgYW4gb2JqZWN0IHdpdGggcmVmZXJlbmNlc1xuICAgIC8vIHRvIGNoaWxkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbnMuXG4gICAgc3Vic2NyaWJlci5jaWQgICAgICA9ICdzdWJzY3JpYmVyJyArIFV0aWxzLnVuaXF1ZUlkKCk7XG4gICAgc3Vic2NyaWJlci5jaGlsZHJlbiA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB0aGlzIGZ1bmN0aW9uIHdpdGggZXZlcnkgY2hhbmdlIHdpdGggdGhlIGxpc3RlbmVycy5cbiAgICAgKi9cbiAgICB2YXIgY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgdGhlIHRyaWdnZXJlZCBmbGFnIGhhcyBiZWVuIHNldCwgZG9uJ3QgY2F1c2UgYW5vdGhlciB1cGRhdGUuXG4gICAgICBpZiAoc3Vic2NyaWJlci50cmlnZ2VyZWQpIHsgcmV0dXJuOyB9XG5cbiAgICAgIC8vIFNldCBhIHRyaWdnZXJlZCBmbGFnIHRvIGF2b2lkIG11bHRpcGxlIHRyaWdnZXJzLiBBbHNvIHVuc3Vic2NyaWJlIGFueVxuICAgICAgLy8gY2hpbGRyZW4gaW1tZWRpYXRlbHkgdG8gc3RvcCB1cGRhdGUgY2xhc2hlcy5cbiAgICAgIHN1YnNjcmliZXIudHJpZ2dlcmVkID0gdHJ1ZTtcbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gICAgICBzdWJzY3JpYmVyLl9leGVjID0gVk0uZXhlYyhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN1YnNjcmliZXIuYmVmb3JlVXBkYXRlKCk7XG4gICAgICAgIHN1YnNjcmliZXIudXBkYXRlKHN1YnNjcmliZXIuZXhlYygpKTtcbiAgICAgICAgc3Vic2NyaWJlci5hZnRlclVwZGF0ZSgpO1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci50cmlnZ2VyZWQ7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGEgc3Vic2NyaXB0aW9ucyBvYmplY3QgYW5kIHVuc3Vic2NyaWJlIGV2ZXJ5dGhpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzdWJzY3JpcHRpb25zXG4gICAgICovXG4gICAgdmFyIGVhY2hTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucywgZm4pIHtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN1YnNjcmlwdGlvbnNbcHJvcGVydHldKSB7XG4gICAgICAgICAgZm4oc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSwgcHJvcGVydHksIGNoYW5nZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBhbmQgZXhlY3V0ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHN1YnNjcmlwdGlvbnNcbiAgICAgKi9cbiAgICB2YXIgaXRlcmF0aW9uID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaXB0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBzdWJzY3JpcHRpb25zW2ldKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gdGhlIHJlc3VsdC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgc3Vic2NyaWJlci5leGVjID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBhIHBhcmVudCBzdWJzY3JpYmVyLCBsaW5rIHRoZSBzdWJzY3JpYmVycyB0b2dldGhlci5cbiAgICAgIGlmIChWTS5zdWJzY3JpYmVyKSB7XG4gICAgICAgIHN1YnNjcmliZXIucGFyZW50ID0gVk0uc3Vic2NyaWJlcjtcbiAgICAgICAgVk0uc3Vic2NyaWJlci5jaGlsZHJlbltzdWJzY3JpYmVyLmNpZF0gPSBzdWJzY3JpYmVyO1xuICAgICAgfVxuXG4gICAgICAvLyBBbGlhcyBzdWJzY3JpYmVyIGZ1bmN0aW9uYWxpdHkgdG8gdGhlIFZNIG9iamVjdC5cbiAgICAgIFZNLnN1YnNjcmliZXIgID0gc3Vic2NyaWJlcjtcbiAgICAgIFZNLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zLnB1c2goZm4pO1xuICAgICAgfTtcblxuICAgICAgLy8gUmVzZXQgc3Vic2NyaXB0aW9ucyBiZWZvcmUgZXhlY3V0aW9uLlxuICAgICAgc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zICAgPSB7fTtcbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgICAgIHZhciByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAvLyBSZXNldCB0aGUgVk0gZnVuY3Rpb25hbGl0eSB0byB3aGF0IGl0IHdhcyBiZWZvcmVoYW5kLlxuICAgICAgVk0uc3Vic2NyaWJlciAgPSBzdWJzY3JpYmVyLnBhcmVudDtcbiAgICAgIFZNLnVuc3Vic2NyaWJlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUnVuIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHdlIHJ1biBhbiB1cGRhdGUgZnVuY3Rpb24uIFRoaXMgaXMgcmVxdWlyZWRcbiAgICAgKiBzaW5jZSB3ZSBkb24ndCB3YW50IHRvIHJ1biB1bnN1YnNjcmlwdGlvbnMgdW50aWwgYWZ0ZXIgdGhlIHJlbmRlciB1cGRhdGUuXG4gICAgICovXG4gICAgc3Vic2NyaWJlci5iZWZvcmVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpdGVyYXRpb24oc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMpO1xuICAgICAgc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9ucyA9IHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUnVuIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgYW4gdXBkYXRlLiBJdCB3aWxsIGNoZWNrIGZvciBkaWZmZXJlbmNlIGluIHRoZVxuICAgICAqIGJlZm9yZSBhbmQgYWZ0ZXIgdXBkYXRlcy5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLmFmdGVyVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnM7XG5cbiAgICAgIC8vIERpZmYgdGhlIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgYW5kIG5ldyBzdWJzY3JpcHRpb25zIHRvIGFkZC9yZW1vdmVcbiAgICAgIC8vIGxpc3RlbmVycyBhcyBuZWVkZWQuIFRoaXMgc2hvdWxkIGJlIG1vcmUgbWVtb3J5IGVmZmljaWVudCB0aGFuIGJsaW5kbHlcbiAgICAgIC8vIGFkZGluZyBhbmQgcmVtb3ZpbmcgbGlzdGVuZXJzIGV2ZXJ5IHRpbWUuXG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSkge1xuICAgICAgICAgIGlmICghc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSkge1xuICAgICAgICAgICAgRE9NQmFycy5zdWJzY3JpYmUoc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSwgcHJvcGVydHksIGNoYW5nZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBMb29wIG92ZXIgcHJldmlvdXMgc3Vic2NyaXB0aW9ucyB0aGF0IG5vIGxvbmdlciBleGlzdCBhbmQgdW5zdWJzY3JpYmUuXG4gICAgICBlYWNoU3Vic2NyaXB0aW9uKHN1YnNjcmliZXIucHJldlN1YnNjcmlwdGlvbnMsIERPTUJhcnMudW5zdWJzY3JpYmUpO1xuXG4gICAgICBkZWxldGUgc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9ucztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIHRoZSBjdXJyZW50IHN1YnNjcmliZXIgZnJvbSBhbGwgbGlzdGVuZXJzLiBXZSBhbHNvIG5lZWQgdG8gY2FuY2VsXG4gICAgICogYW55IGN1cnJlbnQgZXhlY3V0aW9uIGV2ZW50IGFuZCByZW1vdmUgYSByZWZlcmVuY2UgZnJvbSB0aGUgcGFyZW50XG4gICAgICogc3Vic2NyaXB0aW9uLlxuICAgICAqL1xuICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBWTS5leGVjLmNhbmNlbChzdWJzY3JpYmVyLl9leGVjKTtcbiAgICAgIGl0ZXJhdGlvbihzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyk7XG4gICAgICBlYWNoU3Vic2NyaXB0aW9uKHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucywgRE9NQmFycy51bnN1YnNjcmliZSk7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVyLnBhcmVudCkge1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdO1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuICAgIH07XG5cbiAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBjaGlsZCBpbiBzdWJzY3JpYmVyLmNoaWxkcmVuKSB7XG4gICAgICAgIHN1YnNjcmliZXIuY2hpbGRyZW5bY2hpbGRdLnVuc3Vic2NyaWJlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzdWJzY3JpYmVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgYW5kIHN1YnNjcmliZSBhIHNpbmdsZSBET00gbm9kZSB1c2luZyBhIGN1c3RvbSBjcmVhdGlvbiBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjcmVhdGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBzdWJzY3JpYmVOb2RlID0gZnVuY3Rpb24gKGZuLCBjcmVhdGUpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKGZuKTtcblxuICAgIC8vIFdlIG5lZWQgdG8gYWRkIGEgYmVmb3JlIGFuZCBhZnRlciBlbGVtZW50IHBsYWNlaG9sZGVyIHNpbmNlIHRoZSBwaWVjZXNcbiAgICAvLyBpbiBiZXR3ZWVuIGNhbiBiZSBlbmFibGVkIGFuZCBkaXNhYmxlZCByYW5kb21seS5cbiAgICB2YXIgcGxhY2Vob2xkZXIgPSB7XG4gICAgICBhZnRlcjogIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSxcbiAgICAgIGJlZm9yZTogZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpXG4gICAgfTtcblxuICAgIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIHRvIGtlZXAgdHJhY2sgb2YgZG9jdW1lbnQgZnJhZ21lbnQgY2hpbGRyZW4uXG4gICAgdmFyIGdlbmVyYXRlID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgICAgLy8gVG8ga2VlcCB0cmFjayBvZiB0aGUgaW5zZXJ0aW9ucyBhbmQgZGVsZXRpb25zIGFjY3VyYXRlbHkgd2UgbmVlZCB0b1xuICAgICAgLy8gYWRkIHBsYWNlaG9sZGVyIERPTSBlbGVtZW50cy5cbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHBsYWNlaG9sZGVyLmJlZm9yZSk7XG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChjcmVhdGUodGV4dCkpO1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQocGxhY2Vob2xkZXIuYWZ0ZXIpO1xuXG4gICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBwYXJlbnROb2RlID0gcGxhY2Vob2xkZXIuYmVmb3JlLnBhcmVudE5vZGU7XG4gICAgICB2YXIgY2hpbGROb2RlcyA9IHBhcmVudE5vZGUuY2hpbGROb2RlcztcblxuICAgICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBjaGlsZCBub2RlcyB0byByZW1vdmUgdGhlIGF0dGFjaGVkIGNoaWxkcmVuLlxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJlbnROb2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gV2hlbiB3ZSBmaW5kIHRoZSBgYmVmb3JlYCBwbGFjZWhvbGRlciBub2RlLCBzdGFydCByZW1vdmluZyBhbGxcbiAgICAgICAgLy8gdGhlIGNoaWxkIG5vZGVzIHVudGlsIHdlIGhpdCB0aGUgYGFmdGVyYCBwbGFjZWhvbGRlciBub2RlLlxuICAgICAgICBpZiAoY2hpbGROb2Rlc1tpXSA9PT0gcGxhY2Vob2xkZXIuYmVmb3JlKSB7XG4gICAgICAgICAgZG8ge1xuICAgICAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjaGlsZE5vZGVzW2ldKTtcbiAgICAgICAgICB9IHdoaWxlIChjaGlsZE5vZGVzW2ldICE9PSBwbGFjZWhvbGRlci5hZnRlcik7XG5cbiAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBwbGFjZWhvbGRlci5hZnRlci5uZXh0U2libGluZztcbiAgICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShnZW5lcmF0ZSh2YWx1ZSksIG5leHRTaWJsaW5nKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZ2VuZXJhdGUoc3Vic2NyaXB0aW9uKCkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gZWxlbWVudCBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLiBUaGlzIG1ldGhvZCByZXF1aXJlcyBhXG4gICAqIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBhbnkgZWxlbWVudCBjaGFuZ2VzIHNpbmNlIHlvdSBjYW4ndCBjaGFuZ2UgYSB0YWdcbiAgICogbmFtZSBpbiBwbGFjZS5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYlxuICAgKiBAcmV0dXJuIHtFbGVtZW50fVxuICAgKi9cbiAgVk0uY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKGZuKTtcbiAgICB2YXIgZWwgICAgICAgICAgID0gVXRpbHMuY3JlYXRlRWxlbWVudChzdWJzY3JpcHRpb24oKSk7XG5cbiAgICBzdWJzY3JpcHRpb24udXBkYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBjYihlbCA9IFV0aWxzLmNvcHlBbmRSZXBsYWNlTm9kZShVdGlscy5jcmVhdGVFbGVtZW50KHZhbHVlKSwgZWwpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGVsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgYW4gZWxlbWVudHMgYXR0cmlidXRlLiBXZSBhY2NlcHQgdGhlIGN1cnJlbnQgZWxlbWVudCBhIGZ1bmN0aW9uXG4gICAqIGJlY2F1c2Ugd2hlbiBhIHRhZyBuYW1lIGNoYW5nZXMgd2Ugd2lsbCBsb3NlIHJlZmVyZW5jZSB0byB0aGUgYWN0aXZlbHlcbiAgICogcmVuZGVyZWQgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZWxlbWVudEZuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5hbWVGblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSB2YWx1ZUZuXG4gICAqL1xuICBWTS5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWxlbWVudEZuLCBuYW1lRm4sIHZhbHVlRm4pIHtcbiAgICB2YXIgbmFtZVN1YnNjcmlwdGlvbiAgPSBWTS5zdWJzY3JpYmUobmFtZUZuKTtcbiAgICB2YXIgdmFsdWVTdWJzY3JpcHRpb24gPSBWTS5zdWJzY3JpYmUodmFsdWVGbik7XG5cbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBjdXJyZW50IG5hbWUgYW5kIHZhbHVlIHdpdGhvdXQgaGF2aW5nIHRvIHJlLXJ1biB0aGVcbiAgICAvLyBmdW5jdGlvbiBldmVyeSB0aW1lIHNvbWV0aGluZyBjaGFuZ2VzLlxuICAgIHZhciBhdHRyTmFtZSAgPSBuYW1lU3Vic2NyaXB0aW9uKCk7XG4gICAgdmFyIGF0dHJWYWx1ZSA9IHZhbHVlU3Vic2NyaXB0aW9uKCk7XG5cbiAgICBuYW1lU3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgVXRpbHMucmVtb3ZlQXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSk7XG4gICAgICBVdGlscy5zZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lID0gdmFsdWUsIGF0dHJWYWx1ZSk7XG4gICAgfTtcblxuICAgIHZhbHVlU3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgVXRpbHMuc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSwgYXR0clZhbHVlID0gdmFsdWUpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVXRpbHMuc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgRE9NIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBWTS5jcmVhdGVET00gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlTm9kZShmbiwgVXRpbHMuZG9taWZ5RXhwcmVzc2lvbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIHRleHQgbm9kZSBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7VGV4dH1cbiAgICovXG4gIFZNLmNyZWF0ZVRleHQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlTm9kZShmbiwgVXRpbHMudGV4dGlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0NvbW1lbnR9XG4gICAqL1xuICBWTS5jcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IFZNLnN1YnNjcmliZShmbik7XG4gICAgdmFyIG5vZGUgICAgICAgICA9IFV0aWxzLmNyZWF0ZUNvbW1lbnQoc3Vic2NyaXB0aW9uKCkpO1xuXG4gICAgc3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgbm9kZS50ZXh0Q29udGVudCA9IHZhbHVlO1xuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogR2VuZXJhdGUgYW4gZXhlY3V0YWJsZSB0ZW1wbGF0ZSBmcm9tIGEgdGVtcGxhdGUgc3BlYy5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIHRlbXBsYXRlU3BlY1xuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIFZNLnRlbXBsYXRlID0gRE9NQmFycy50ZW1wbGF0ZSA9IGZ1bmN0aW9uICh0ZW1wbGF0ZVNwZWMpIHtcbiAgICB2YXIgRE9NQmFycyA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgY29udGFpbmVyIG9iamVjdCBob2xkcyBhbGwgdGhlIGZ1bmN0aW9ucyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBzcGVjLlxuICAgICAqXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgaW52b2tlUGFydGlhbDogICAgVk0uaW52b2tlUGFydGlhbCxcbiAgICAgIHByb2dyYW1zOiAgICAgICAgIFtdLFxuICAgICAgbm9vcDogICAgICAgICAgICAgVk0ubm9vcCxcbiAgICAgIGNvbXBpbGVySW5mbzogICAgIG51bGwsXG4gICAgICBhcHBlbmRDaGlsZDogICAgICBVdGlscy5hcHBlbmRDaGlsZCxcbiAgICAgIGNyZWF0ZURPTTogICAgICAgIFZNLmNyZWF0ZURPTSxcbiAgICAgIGNyZWF0ZVRleHQ6ICAgICAgIFZNLmNyZWF0ZVRleHQsXG4gICAgICBzZXRBdHRyaWJ1dGU6ICAgICBWTS5zZXRBdHRyaWJ1dGUsXG4gICAgICBjcmVhdGVDb21tZW50OiAgICBWTS5jcmVhdGVDb21tZW50LFxuICAgICAgY3JlYXRlRWxlbWVudDogICAgVk0uY3JlYXRlRWxlbWVudCxcbiAgICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBWTS5wcm9ncmFtV2l0aERlcHRoXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgcHJvZ3JhbSBzaW5nbGV0b24gYmFzZWQgb24gaW5kZXguXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgaVxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgICAqIEBwYXJhbSAge09iamVjdH0gICBkYXRhXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAgICovXG4gICAgY29udGFpbmVyLnByb2dyYW0gPSBmdW5jdGlvbiAoaSwgZm4sIGRhdGEpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG5cbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBWTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9ncmFtc1tpXSA9IFZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE1lcmdlIHR3byBvYmplY3RzIGludG8gYSBzaW5nbGUgb2JqZWN0LlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBwYXJhbVxuICAgICAqIEBwYXJhbSAge09iamVjdH0gY29tbW9uXG4gICAgICogQHJldHVybiB7T2JqZWN0fVxuICAgICAqL1xuICAgIGNvbnRhaW5lci5tZXJnZSA9IGZ1bmN0aW9uIChwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uKSB7XG4gICAgICAgIHJldCA9IHt9O1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCBhIHByb3BlcnR5IGZyb20gYW4gb2JqZWN0LiBQYXNzZXMgaW4gdGhlIG9iamVjdCBpZCAoZGVwdGgpIHRvIG1ha2UgaXRcbiAgICAgKiBtdWNoIGZhc3RlciB0byBkbyBjb21wYXJpc29ucyBiZXR3ZWVuIG5ldyBhbmQgb2xkIHN1YnNjcmlwdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICBjb250YWluZXIuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGlkKSB7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IFZNLnN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucztcblxuICAgICAgKHN1YnNjcmlwdGlvbnNbcHJvcGVydHldIHx8IChzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSA9IHt9KSlbaWRdID0gb2JqZWN0O1xuXG4gICAgICByZXR1cm4gRE9NQmFycy5nZXQob2JqZWN0LCBwcm9wZXJ0eSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7Tm9kZX1cbiAgICAgKi9cbiAgICByZXR1cm4gZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAvLyBTdWJzY3JpYmUgdG8gdGhlIHRlbXBsYXRlIHNwZWMgaW5zaWRlIHRoZSByZXR1cm5lZCBmdW5jdGlvbi4gVGhpcyBpcyBzb1xuICAgICAgLy8gdGhhdCAqZXZlcnkqIGdlbmVyYXRlZCBET00gdGVtcGxhdGUgd2lsbCBoYXZlIGEgZGlmZmVyZW50IHVuc3Vic2NyaWJlXG4gICAgICAvLyBtZXRob2QuXG4gICAgICB2YXIgc3Vic2NyaWJlciA9IFZNLnN1YnNjcmliZSh0ZW1wbGF0ZVNwZWMpO1xuXG4gICAgICB2YXIgcmVzdWx0ID0gc3Vic2NyaWJlci5jYWxsKFxuICAgICAgICBjb250YWluZXIsXG4gICAgICAgIERPTUJhcnMsXG4gICAgICAgIGNvbnRleHQsXG4gICAgICAgIG9wdGlvbnMuaGVscGVycyxcbiAgICAgICAgb3B0aW9ucy5wYXJ0aWFscyxcbiAgICAgICAgb3B0aW9ucy5kYXRhXG4gICAgICApO1xuXG4gICAgICAvLyBBdHRhY2ggdGhlIGN1cnJlbnQgb3BlcmF0aW5nIGNvbnRleHQgdG8gdGhlIFZNIG9iamVjdCBmb3IgcmVmZXJlbmNlXG4gICAgICAvLyB3aXRoaW4gdGhlIHV0aWxpdHkgZnVuY3Rpb25zLlxuICAgICAgVk0uY29udGV4dCA9IGNvbnRleHQ7XG5cbiAgICAgIC8vIEF0dGFjaCBhbiBgdW5zdWJzY3JpYmVgIGZ1bmN0aW9uIHRvIHRoZSByZXN1bHRpbmcgRE9NLlxuICAgICAgLy8gVE9ETzogQ29tZSB1cCB3aXRoIGFuIGltcHJvdmVkIHNvbHV0aW9uLlxuICAgICAgcmVzdWx0LnVuc3Vic2NyaWJlID0gc3Vic2NyaWJlci51bnN1YnNjcmliZTtcblxuICAgICAgdmFyIGNvbXBpbGVySW5mbyAgICAgPSBjb250YWluZXIuY29tcGlsZXJJbmZvIHx8IFtdO1xuICAgICAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm9bMF0gfHwgMTtcbiAgICAgIHZhciBjdXJyZW50UmV2aXNpb24gID0gRE9NQmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgID0gRE9NQmFycy5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl07XG4gICAgICAgICAgdmFyIGNvbXBpbGVyVmVyc2lvbnMgPSBET01CYXJzLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mICcgK1xuICAgICAgICAgICAgJ0RPTUJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXInICtcbiAgICAgICAgICAgICcgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgcnVudGltZVZlcnNpb25zICsgJykgb3IgZG93bmdyYWRlIHlvdXIgJyArXG4gICAgICAgICAgICAncnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uICgnICsgY29tcGlsZXJWZXJzaW9ucyArICcpJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZicgK1xuICAgICAgICAgICdET01CYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gJyArXG4gICAgICAgICAgJ2EgbmV3ZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVySW5mb1sxXSArICcpJyk7XG4gICAgICB9XG5cbiAgICAgIFZNLmNvbnRleHQgPSBudWxsO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgcmV0dXJuIERPTUJhcnM7XG59O1xuIiwidmFyIHV0aWxzICAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscycpO1xudmFyIGV2ZW50cyAgID0gcmVxdWlyZSgnLi9jb21waWxlci9ldmVudHMnKTtcbnZhciB1bmlxdWVJZCA9IDA7XG5cbi8qKlxuICogQXR0YWNoIHJldXNhYmxlIHV0aWxpdHkgZnVuY3Rpb25zIHRvIHRoZSBET01CYXJzIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gRE9NQmFyc1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uIChET01CYXJzKSB7XG4gIHZhciBVdGlscyA9IHV0aWxzLmF0dGFjaChET01CYXJzKS5VdGlscztcblxuICAvLyBFeHRlbmQgdGhlIERPTUJhcnMgcm9vdCBvYmplY3Qgd2l0aCBhbiBldmVudCBlbWl0dGVyLlxuICBET01CYXJzLlV0aWxzLmV4dGVuZChET01CYXJzLCBldmVudHMpO1xuXG4gIC8qKlxuICAgKiBTaW1wbGUgZnVuY3Rpb24gd3JhcHBlciB0aGF0IHdpbGwgZW1pdCB0aGUgZXZlbnQgd2l0aCB0aGUgcmVzdWx0IG9mIHRoZVxuICAgKiBmdW5jdGlvbiBleGVjdXRpb24gZXZlcnkgdGltZSB0aGUgZnVuY3Rpb24gaXMgcnVuLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7U3RyaW5nfSAgIGV2ZW50XG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgdmFyIGVtaXR0ZXIgPSBmdW5jdGlvbiAoZm4sIGV2ZW50KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgRE9NQmFycy5lbWl0KGV2ZW50LCByZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSB1bmlxdWUgaWQuXG4gICAqXG4gICAqIEByZXR1cm4ge051bWJlcn1cbiAgICovXG4gIFV0aWxzLnVuaXF1ZUlkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB1bmlxdWVJZCsrO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGFuIG9iamVjdCBpcyBhY3R1YWxseSBhIERPTSBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0gIHsqfSAgICAgICBlbGVtZW50XG4gICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAqL1xuICBVdGlscy5pc05vZGUgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50IGluc3RhbmNlb2YgTm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgZnJvbSBhIHRhZyBuYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFV0aWxzLmNyZWF0ZUVsZW1lbnQgPSBlbWl0dGVyKGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH0sICdjcmVhdGVFbGVtZW50Jyk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGNvbW1lbnQgbm9kZSBiYXNlZCBvbiB0ZXh0IGNvbnRlbnRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRlbnRzXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBVdGlscy5jcmVhdGVDb21tZW50ID0gZW1pdHRlcihmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChjb250ZW50cyk7XG4gIH0sICdjcmVhdGVDb21tZW50Jyk7XG5cbiAgLyoqXG4gICAqIENvcHkgYWxsIHNpZ25pZmljYW50IGRhdGEgZnJvbSBvbmUgZWxlbWVudCBub2RlIHRvIGFub3RoZXIuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVXRpbHMuY29weU5vZGUgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICAgIC8vIE1vdmUgYWxsIGNoaWxkIGVsZW1lbnRzIHRvIHRoZSBuZXcgbm9kZS5cbiAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSB7XG4gICAgICBuZXdOb2RlLmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZCk7XG4gICAgfVxuXG4gICAgLy8gQ29weSBhbGwgdGhlIGF0dHJpYnV0ZXMgdG8gdGhlIG5ldyBub2RlLlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2xkTm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0cmlidXRlID0gb2xkTm9kZS5hdHRyaWJ1dGVzW2ldO1xuICAgICAgVXRpbHMuc2V0QXR0cmlidXRlKG5ld05vZGUsIGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVXRpbHMuY29weUFuZFJlcGxhY2VOb2RlID0gZnVuY3Rpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgICBvbGROb2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKFV0aWxzLmNvcHlOb2RlKG5ld05vZGUsIG9sZE5vZGUpLCBvbGROb2RlKTtcbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IGFuIGF0dHJpYnV0ZSB2YWx1ZSBvbiBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9ICAgZWxlbWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0geyp9ICAgICAgdmFsdWVcbiAgICovXG4gIFV0aWxzLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBVdGlscy5yZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgbmFtZSk7XG4gICAgfVxuXG4gICAgRE9NQmFycy5lbWl0KCdzZXRBdHRyaWJ1dGUnLCBlbGVtZW50LCBuYW1lLCB2YWx1ZSk7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW4gYXR0cmlidXRlIGZyb20gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICovXG4gIFV0aWxzLnJlbW92ZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBuYW1lKSB7XG4gICAgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlKG5hbWUpKSB7XG4gICAgICBET01CYXJzLmVtaXQoJ3JlbW92ZUF0dHJpYnV0ZScsIGVsZW1lbnQsIG5hbWUpO1xuICAgICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBlbmQgYSBjaGlsZCBlbGVtZW50IHRvIGEgRE9NIG5vZGUuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gcGFyZW50XG4gICAqIEBwYXJhbSB7Tm9kZX0gY2hpbGRcbiAgICovXG4gIFV0aWxzLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGQpIHtcbiAgICBpZiAoY2hpbGQgPT0gbnVsbCkgeyByZXR1cm47IH1cblxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgRE9NQmFycy5lbWl0KCdhcHBlbmRDaGlsZCcsIHBhcmVudCwgY2hpbGQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhcmJpdHJhcnkgRE9NIG5vZGVzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVXRpbHMuZG9taWZ5RXhwcmVzc2lvbiA9IGVtaXR0ZXIoZnVuY3Rpb24gKHN0cmluZykge1xuICAgIGlmIChVdGlscy5pc05vZGUoc3RyaW5nKSkge1xuICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmlubmVySFRNTCA9IHN0cmluZztcblxuICAgIGlmIChkaXYuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHJldHVybiBkaXYucmVtb3ZlQ2hpbGQoZGl2LmNoaWxkTm9kZXNbMF0pO1xuICAgIH1cblxuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgIHdoaWxlIChkaXYuZmlyc3RDaGlsZCkge1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICAgIH1cblxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfSwgJ2RvbWlmeScpO1xuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhIERPTSB0ZXh0IG5vZGUgZm9yIGFwcGVuZGluZyB0byB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIEBwYXJhbSAge1N0cmluZ30gc3RyaW5nXG4gICAqIEByZXR1cm4ge1RleHR9XG4gICAqL1xuICBVdGlscy50ZXh0aWZ5RXhwcmVzc2lvbiA9IGVtaXR0ZXIoZnVuY3Rpb24gKHN0cmluZykge1xuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBET01CYXJzLlNhZmVTdHJpbmcpIHtcbiAgICAgIHJldHVybiBVdGlscy5kb21pZnlFeHByZXNzaW9uKHN0cmluZy50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICAvLyBDYXRjaCB3aGVuIHRoZSBzdHJpbmcgaXMgYWN0dWFsbHkgYSBET00gbm9kZSBhbmQgdHVybiBpdCBpbnRvIGEgc3RyaW5nLlxuICAgIGlmIChVdGlscy5pc05vZGUoc3RyaW5nKSkge1xuICAgICAgLy8gQWxyZWFkeSBhIHRleHQgbm9kZSwganVzdCByZXR1cm4gaXQgaW1tZWRpYXRlbHkuXG4gICAgICBpZiAoc3RyaW5nLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygc3RyaW5nLm91dGVySFRNTCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZy5vdXRlckhUTUwpO1xuICAgICAgfVxuXG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuYXBwZW5kQ2hpbGQoc3RyaW5nLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGl2LmlubmVySFRNTCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZyA9PSBudWxsID8gJycgOiBzdHJpbmcpO1xuICB9LCAndGV4dGlmeScpO1xuXG4gIHJldHVybiBET01CYXJzO1xufTtcbiIsIi8qanNoaW50IGVxbnVsbDogdHJ1ZSAqL1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcblxudmFyIEhhbmRsZWJhcnMgPSB7fTtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WRVJTSU9OID0gXCIxLjAuMFwiO1xuSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5cbkhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5cbkhhbmRsZWJhcnMuaGVscGVycyAgPSB7fTtcbkhhbmRsZWJhcnMucGFydGlhbHMgPSB7fTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBmdW5jdGlvblR5cGUgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciA9IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCA9IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG5cbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuKHRoaXMpO1xuICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gIH0gZWxzZSBpZih0eXBlID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcbiAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMuSyA9IGZ1bmN0aW9uKCkge307XG5cbkhhbmRsZWJhcnMuY3JlYXRlRnJhbWUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uKG9iamVjdCkge1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gb2JqZWN0O1xuICB2YXIgb2JqID0gbmV3IEhhbmRsZWJhcnMuSygpO1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gbnVsbDtcbiAgcmV0dXJuIG9iajtcbn07XG5cbkhhbmRsZWJhcnMubG9nZ2VyID0ge1xuICBERUJVRzogMCwgSU5GTzogMSwgV0FSTjogMiwgRVJST1I6IDMsIGxldmVsOiAzLFxuXG4gIG1ldGhvZE1hcDogezA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InfSxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAoSGFuZGxlYmFycy5sb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBIYW5kbGViYXJzLmxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMubG9nID0gZnVuY3Rpb24obGV2ZWwsIG9iaikgeyBIYW5kbGViYXJzLmxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgIGRhdGEgPSBIYW5kbGViYXJzLmNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gIH1cblxuICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgIGlmKGNvbnRleHQgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5pbmRleCA9IGk7IH1cbiAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYoaSA9PT0gMCl7XG4gICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29uZGl0aW9uYWwpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoIWNvbmRpdGlvbmFsIHx8IEhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbn0pO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAoIUhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gIEhhbmRsZWJhcnMubG9nKGxldmVsLCBjb250ZXh0KTtcbn0pO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVk0gPSB7XG4gIHRlbXBsYXRlOiBmdW5jdGlvbih0ZW1wbGF0ZVNwZWMpIHtcbiAgICAvLyBKdXN0IGFkZCB3YXRlclxuICAgIHZhciBjb250YWluZXIgPSB7XG4gICAgICBlc2NhcGVFeHByZXNzaW9uOiBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBpbnZva2VQYXJ0aWFsOiBIYW5kbGViYXJzLlZNLmludm9rZVBhcnRpYWwsXG4gICAgICBwcm9ncmFtczogW10sXG4gICAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgICAgfSxcbiAgICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICAgIHJldCA9IHt9O1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfSxcbiAgICAgIHByb2dyYW1XaXRoRGVwdGg6IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICAgIG5vb3A6IEhhbmRsZWJhcnMuVk0ubm9vcCxcbiAgICAgIGNvbXBpbGVySW5mbzogbnVsbFxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoY29udGFpbmVyLCBIYW5kbGViYXJzLCBjb250ZXh0LCBvcHRpb25zLmhlbHBlcnMsIG9wdGlvbnMucGFydGlhbHMsIG9wdGlvbnMuZGF0YSk7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gPSBjb250YWluZXIuY29tcGlsZXJJbmZvIHx8IFtdLFxuICAgICAgICAgIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgICAgICBjdXJyZW50UmV2aXNpb24gPSBIYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfSxcblxuICBwcm9ncmFtV2l0aERlcHRoOiBmdW5jdGlvbihpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSAwO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBub29wOiBmdW5jdGlvbigpIHsgcmV0dXJuIFwiXCI7IH0sXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gICAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gICAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICghSGFuZGxlYmFycy5jb21waWxlKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IEhhbmRsZWJhcnMuY29tcGlsZShwYXJ0aWFsLCB7ZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkfSk7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLnRlbXBsYXRlID0gSGFuZGxlYmFycy5WTS50ZW1wbGF0ZTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xuXG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuSGFuZGxlYmFycy5FeGNlcHRpb24gPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cbn07XG5IYW5kbGViYXJzLkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbkhhbmRsZWJhcnMuU2FmZVN0cmluZyA9IGZ1bmN0aW9uKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn07XG5IYW5kbGViYXJzLlNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0cmluZy50b1N0cmluZygpO1xufTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbnZhciBlc2NhcGVDaGFyID0gZnVuY3Rpb24oY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59O1xuXG5IYW5kbGViYXJzLlV0aWxzID0ge1xuICBleHRlbmQ6IGZ1bmN0aW9uKG9iaiwgdmFsdWUpIHtcbiAgICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgaWYodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGVzY2FwZUV4cHJlc3Npb246IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgSGFuZGxlYmFycy5TYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCB8fCBzdHJpbmcgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSBzdHJpbmcudG9TdHJpbmcoKTtcblxuICAgIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG4gIH0sXG5cbiAgaXNFbXB0eTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYodG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBBcnJheV1cIiAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59O1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwiLyoqXG4gKiBFeHBvc2UgYHJlcXVlc3RBbmltYXRpb25GcmFtZSgpYC5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgZmFsbGJhY2s7XG5cbi8qKlxuICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24uXG4gKi9cblxudmFyIHByZXYgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbmZ1bmN0aW9uIGZhbGxiYWNrKGZuKSB7XG4gIHZhciBjdXJyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIHZhciBtcyA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnIgLSBwcmV2KSk7XG4gIHZhciByZXEgPSBzZXRUaW1lb3V0KGZuLCBtcyk7XG4gIHByZXYgPSBjdXJyO1xuICByZXR1cm4gcmVxO1xufVxuXG4vKipcbiAqIENhbmNlbC5cbiAqL1xuXG52YXIgY2FuY2VsID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm9DYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubXNDYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cuY2xlYXJUaW1lb3V0O1xuXG5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKGlkKXtcbiAgY2FuY2VsLmNhbGwod2luZG93LCBpZCk7XG59O1xuIiwidmFyIGJhc2UgICAgID0gcmVxdWlyZSgnLi9saWIvYmFzZScpO1xudmFyIHV0aWxzICAgID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBydW50aW1lICA9IHJlcXVpcmUoJy4vbGliL3J1bnRpbWUnKTtcblxuLyoqXG4gKiBHZW5lcmF0ZSB0aGUgYmFzZSBET01CYXJzIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIGNyZWF0ZSAoKSB7XG4gIHZhciBET01CYXJzID0gYmFzZS5jcmVhdGUoKTtcblxuICB1dGlscy5hdHRhY2goRE9NQmFycyk7XG4gIHJ1bnRpbWUuYXR0YWNoKERPTUJhcnMpO1xuXG4gIERPTUJhcnMuY3JlYXRlID0gY3JlYXRlO1xuXG4gIHJldHVybiBET01CYXJzO1xufSkoKTtcbiJdfQ==
(9)
});
;