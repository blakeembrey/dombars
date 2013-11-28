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
exports.attach = function(DOMBars) {
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
    subscriber.cid       = 'subscriber' + Utils.uniqueId();
    subscriber.children  = {};
    subscriber.triggered = false;

    /**
     * Trigger this function with every change with the listeners. Stops
     * multiple triggers from updating the same DOM space.
     */
    var change = function () {
      if (subscriber.triggered) { return; }

      subscriber.triggered = true;

      subscriber._exec = VM.exec(function () {
        subscriber.beforeUpdate();
        subscriber.update(subscriber.exec());
        subscriber.afterUpdate();
        subscriber.triggered = false;
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
      subscriber.prevSubscriptions   = subscriber.subscriptions;
      subscriber.prevUnsubscriptions = subscriber.unsubscriptions;

      subscriber.subscriptions   = {};
      subscriber.unsubscriptions = [];

      subscriber.unsubscribeChildren();
    };

    /**
     * Run this function after an update. It will check for difference in the
     * before and after updates.
     */
    subscriber.afterUpdate = function () {
      var subscriptions = subscriber.subscriptions;

      // Diff the previous subscriptions and new subscriptions to add/remove
      // listeners as needed.
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          if (!subscriber.prevSubscriptions[property][key]) {
            DOMBars.subscribe(subscriptions[property][key], property, change);
          } else {
            delete subscriber.prevSubscriptions[property][key];
          }
        }
      }

      iteration(subscriber.prevUnsubscriptions);
      eachSubscription(subscriber.prevSubscriptions, DOMBars.unsubscribe);

      delete subscriber.prevSubscriptions;
      delete subscriber.prevUnsubscriptions;
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
  var subscribeText = function (fn, create) {
    var subscription = VM.subscribe(fn);
    var node         = create(subscription());

    subscription.update = function (value) {
      node.textContent = value;
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
      fragment.appendChild(Utils.domifyExpression(text));
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
   * Create a text node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Text}
   */
  VM.createText = function (fn) {
    return subscribeText(fn, Utils.textifyExpression);
  };

  /**
   * Create a comment node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Comment}
   */
  VM.createComment = function (fn) {
    return subscribeText(fn, Utils.createComment);
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
    if (string == null || string === '') {
      return document.createTextNode('');
    }

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
  setTimeout(fn, ms);
  prev = curr;
}

/**
 * Cancel.
 */

var cancel = window.cancelAnimationFrame
  || window.webkitCancelAnimationFrame
  || window.mozCancelAnimationFrame
  || window.oCancelAnimationFrame
  || window.msCancelAnimationFrame;

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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi91dGlscy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvcmFmLWNvbXBvbmVudC9pbmRleC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgYmFzZSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZScpO1xuXG5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIERPTUJhcnMgPSBiYXNlLmNyZWF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8qKlxuICAgKiBOb29wIGZ1bmN0aW9ucyBmb3Igc3Vic2NyaWJlIGFuZCB1bnN1YnNjcmliZS4gSW1wbGVtZW50IHlvdXIgb3duIGZ1bmN0aW9uLlxuICAgKi9cbiAgRE9NQmFycy5zdWJzY3JpYmUgPSBET01CYXJzLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge307XG5cbiAgLyoqXG4gICAqIEJhc2ljIGdldHRlciBmdW5jdGlvbi4gQXR0YWNoIHRoaXMgaG93ZXZlciB5b3Ugd2FudCBpdCB0byB3b3JrLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gICAqIEByZXR1cm4geyp9XG4gICAqL1xuICBET01CYXJzLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIG9iamVjdFtwcm9wZXJ0eV07XG4gIH07XG5cbiAgLyoqXG4gICAqIEhhbmRsZWJhcnMgYGVhY2hgIGhlbHBlciBpcyBpbmNvbXBhdGliYWJsZSB3aXRoIERPTUJhcnMsIHNpbmNlIGl0IGFzc3VtZXNcbiAgICogc3RyaW5ncyAoYXMgb3Bwb3NlZCB0byBkb2N1bWVudCBmcmFnbWVudHMpLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBET01CYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgZm4gICAgICA9IG9wdGlvbnMuZm47XG4gICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGJ1ZmZlciAgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgdmFyIGkgICAgICAgPSAwO1xuICAgIHZhciBkYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBET01CYXJzLmNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGxlbiA9IGNvbnRleHQubGVuZ3RoO1xuXG4gICAgICBpZiAobGVuID09PSArbGVuKSB7XG4gICAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBpZiAoZGF0YSkgeyBkYXRhLmluZGV4ID0gaTsgfVxuICAgICAgICAgIGJ1ZmZlci5hcHBlbmRDaGlsZChmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGlmIChkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgICBidWZmZXIuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtrZXldLCB7IGRhdGE6IGRhdGEgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYnVmZmVyO1xuICB9KTtcblxuICByZXR1cm4gRE9NQmFycztcbn07XG5cbiIsInZhciBFdmVudHMgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vKipcbiAqIExpc3RlbiB0byBhbnkgZXZlbnRzIHRyaWdnZXJlZC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub24gPSBmdW5jdGlvbiAobmFtZSwgZm4sIGNvbnRleHQpIHtcbiAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0gfHwgKHRoaXMuX2V2ZW50c1tuYW1lXSA9IFtdKTtcbiAgZXZlbnRzLnB1c2goeyBmbjogZm4sIGNvbnRleHQ6IGNvbnRleHQgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gYW55IGV2ZW50cyB0cmlnZ2VyZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgcmV0dXJuIHRoaXMub24obmFtZSwgZnVuY3Rpb24gc2VsZiAoKSB7XG4gICAgdGhhdC5vZmYobmFtZSwgc2VsZik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSwgY29udGV4dCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBldmVudCBsaXN0ZW5lci5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub2ZmID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIGlmICghbmFtZSkge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50cztcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGV2ZW50c1tpXS5mbiA9PT0gZm4pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyIHx8IGV2ZW50c1tpXS5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoIWV2ZW50cy5sZW5ndGgpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYW4gZXZlbnQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0gIHsqfSAgICAgIC4uLlxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMuZW1pdCA9IGZ1bmN0aW9uIChuYW1lIC8qLCAuLi5hcmdzICovKSB7XG4gIHZhciBhcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tuYW1lXSAmJiB0aGlzLl9ldmVudHNbbmFtZV0uc2xpY2UoKTtcblxuICBpZiAoZXZlbnRzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGV2ZW50c1tpXS5mbi5hcHBseShldmVudHNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuIiwidmFyIHJ1bnRpbWUgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUnKTtcbnZhciBicm93c2VyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCc7XG52YXIgcmFmICAgICA9IGJyb3dzZXIgJiYgcmVxdWlyZSgncmFmLWNvbXBvbmVudCcpO1xuXG4vKipcbiAqIEF0dHJpYnV0ZSBydW50aW1lIGZlYXR1cmVzIHRvIHRoZSBET01CYXJzIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gRE9NQmFyc1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKERPTUJhcnMpIHtcbiAgdmFyIFZNICAgID0gcnVudGltZS5hdHRhY2goRE9NQmFycykuVk07XG4gIHZhciBVdGlscyA9IERPTUJhcnMuVXRpbHM7XG5cbiAgLyoqXG4gICAqIEJpbmQgYSBmdW5jdGlvbiB0byB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7TnVtYmVyfVxuICAgKi9cbiAgVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBicm93c2VyID8gcmFmKGZuKSA6IHNldEltbWVkaWF0ZShmbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbmNlbCBhbiBleGVjdXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZFxuICAgKi9cbiAgVk0uZXhlYy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICByZXR1cm4gYnJvd3NlciA/IHJhZi5jYW5jZWwoaWQpIDogY2xlYXJJbW1lZGlhdGUoaWQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBoYXMgc3Vic2NyaXB0aW9ucyBjYWxsZWQgaW5zaWRlIGFuZCByZXR1cm5zIGEgbmV3XG4gICAqIGZ1bmN0aW9uIHRoYXQgd2lsbCBsaXN0ZW4gdG8gYWxsIHN1YnNjcmlwdGlvbnMgYW5kIGNhbiB1cGRhdGUgd2l0aCBhbnlcbiAgICogY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgVk0uc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgLyoqXG4gICAgICogVGhlIHJldHVybmVkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0YWtlcyBjYXJlIG9mIGFsaWFzaW5nIHRoZVxuICAgICAqIHN1YnNjcmlwdGlvbnMgYXJyYXkgY29ycmVjdGx5LCBzdWJzY3JpYmluZyBmb3IgdXBkYXRlcyBhbmQgdHJpZ2dlcmluZ1xuICAgICAqIHVwZGF0ZXMgd2hlbiBhbnkgb2YgdGhlIHN1YnNjcmlwdGlvbnMgY2hhbmdlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICB2YXIgc3Vic2NyaWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZXN1bHQgPSBzdWJzY3JpYmVyLmV4ZWMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zLCBET01CYXJzLnN1YnNjcmliZSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvLyBLZWVwIGFuIGFycmF5IG9mIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBhbmQgYW4gb2JqZWN0IHdpdGggcmVmZXJlbmNlc1xuICAgIC8vIHRvIGNoaWxkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbnMuXG4gICAgc3Vic2NyaWJlci5jaWQgICAgICAgPSAnc3Vic2NyaWJlcicgKyBVdGlscy51bmlxdWVJZCgpO1xuICAgIHN1YnNjcmliZXIuY2hpbGRyZW4gID0ge307XG4gICAgc3Vic2NyaWJlci50cmlnZ2VyZWQgPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIFRyaWdnZXIgdGhpcyBmdW5jdGlvbiB3aXRoIGV2ZXJ5IGNoYW5nZSB3aXRoIHRoZSBsaXN0ZW5lcnMuIFN0b3BzXG4gICAgICogbXVsdGlwbGUgdHJpZ2dlcnMgZnJvbSB1cGRhdGluZyB0aGUgc2FtZSBET00gc3BhY2UuXG4gICAgICovXG4gICAgdmFyIGNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzdWJzY3JpYmVyLnRyaWdnZXJlZCkgeyByZXR1cm47IH1cblxuICAgICAgc3Vic2NyaWJlci50cmlnZ2VyZWQgPSB0cnVlO1xuXG4gICAgICBzdWJzY3JpYmVyLl9leGVjID0gVk0uZXhlYyhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN1YnNjcmliZXIuYmVmb3JlVXBkYXRlKCk7XG4gICAgICAgIHN1YnNjcmliZXIudXBkYXRlKHN1YnNjcmliZXIuZXhlYygpKTtcbiAgICAgICAgc3Vic2NyaWJlci5hZnRlclVwZGF0ZSgpO1xuICAgICAgICBzdWJzY3JpYmVyLnRyaWdnZXJlZCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhIHN1YnNjcmlwdGlvbnMgb2JqZWN0IGFuZCB1bnN1YnNjcmliZSBldmVyeXRoaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gc3Vic2NyaXB0aW9uc1xuICAgICAqL1xuICAgIHZhciBlYWNoU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMsIGZuKSB7XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSkge1xuICAgICAgICAgIGZuKHN1YnNjcmlwdGlvbnNbcHJvcGVydHldW2tleV0sIHByb3BlcnR5LCBjaGFuZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhbiBhcnJheSBvZiBmdW5jdGlvbnMgYW5kIGV4ZWN1dGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzdWJzY3JpcHRpb25zXG4gICAgICovXG4gICAgdmFyIGl0ZXJhdGlvbiA9IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25zKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmlwdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgc3Vic2NyaXB0aW9uc1tpXSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIHRoZSByZXN1bHQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHsqfVxuICAgICAqL1xuICAgIHN1YnNjcmliZXIuZXhlYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYSBwYXJlbnQgc3Vic2NyaWJlciwgbGluayB0aGUgc3Vic2NyaWJlcnMgdG9nZXRoZXIuXG4gICAgICBpZiAoVk0uc3Vic2NyaWJlcikge1xuICAgICAgICBzdWJzY3JpYmVyLnBhcmVudCA9IFZNLnN1YnNjcmliZXI7XG4gICAgICAgIFZNLnN1YnNjcmliZXIuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdID0gc3Vic2NyaWJlcjtcbiAgICAgIH1cblxuICAgICAgLy8gQWxpYXMgc3Vic2NyaWJlciBmdW5jdGlvbmFsaXR5IHRvIHRoZSBWTSBvYmplY3QuXG4gICAgICBWTS5zdWJzY3JpYmVyICA9IHN1YnNjcmliZXI7XG4gICAgICBWTS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucy5wdXNoKGZuKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFJlc2V0IHN1YnNjcmlwdGlvbnMgYmVmb3JlIGV4ZWN1dGlvbi5cbiAgICAgIHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucyAgID0ge307XG4gICAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyA9IFtdO1xuXG4gICAgICB2YXIgcmVzdWx0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgLy8gUmVzZXQgdGhlIFZNIGZ1bmN0aW9uYWxpdHkgdG8gd2hhdCBpdCB3YXMgYmVmb3JlaGFuZC5cbiAgICAgIFZNLnN1YnNjcmliZXIgID0gc3Vic2NyaWJlci5wYXJlbnQ7XG4gICAgICBWTS51bnN1YnNjcmliZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJ1biB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB3ZSBydW4gYW4gdXBkYXRlIGZ1bmN0aW9uLiBUaGlzIGlzIHJlcXVpcmVkXG4gICAgICogc2luY2Ugd2UgZG9uJ3Qgd2FudCB0byBydW4gdW5zdWJzY3JpcHRpb25zIHVudGlsIGFmdGVyIHRoZSByZW5kZXIgdXBkYXRlLlxuICAgICAqL1xuICAgIHN1YnNjcmliZXIuYmVmb3JlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9ucyAgID0gc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuICAgICAgc3Vic2NyaWJlci5wcmV2VW5zdWJzY3JpcHRpb25zID0gc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnM7XG5cbiAgICAgIHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucyAgID0ge307XG4gICAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyA9IFtdO1xuXG4gICAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlQ2hpbGRyZW4oKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUnVuIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgYW4gdXBkYXRlLiBJdCB3aWxsIGNoZWNrIGZvciBkaWZmZXJlbmNlIGluIHRoZVxuICAgICAqIGJlZm9yZSBhbmQgYWZ0ZXIgdXBkYXRlcy5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLmFmdGVyVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnM7XG5cbiAgICAgIC8vIERpZmYgdGhlIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgYW5kIG5ldyBzdWJzY3JpcHRpb25zIHRvIGFkZC9yZW1vdmVcbiAgICAgIC8vIGxpc3RlbmVycyBhcyBuZWVkZWQuXG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSkge1xuICAgICAgICAgIGlmICghc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSkge1xuICAgICAgICAgICAgRE9NQmFycy5zdWJzY3JpYmUoc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSwgcHJvcGVydHksIGNoYW5nZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpdGVyYXRpb24oc3Vic2NyaWJlci5wcmV2VW5zdWJzY3JpcHRpb25zKTtcbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9ucywgRE9NQmFycy51bnN1YnNjcmliZSk7XG5cbiAgICAgIGRlbGV0ZSBzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zO1xuICAgICAgZGVsZXRlIHN1YnNjcmliZXIucHJldlVuc3Vic2NyaXB0aW9ucztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIHRoZSBjdXJyZW50IHN1YnNjcmliZXIgZnJvbSBhbGwgbGlzdGVuZXJzLiBXZSBhbHNvIG5lZWQgdG8gY2FuY2VsXG4gICAgICogYW55IGN1cnJlbnQgZXhlY3V0aW9uIGV2ZW50IGFuZCByZW1vdmUgYSByZWZlcmVuY2UgZnJvbSB0aGUgcGFyZW50XG4gICAgICogc3Vic2NyaXB0aW9uLlxuICAgICAqL1xuICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBWTS5leGVjLmNhbmNlbChzdWJzY3JpYmVyLl9leGVjKTtcbiAgICAgIGl0ZXJhdGlvbihzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyk7XG4gICAgICBlYWNoU3Vic2NyaXB0aW9uKHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucywgRE9NQmFycy51bnN1YnNjcmliZSk7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVyLnBhcmVudCkge1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdO1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuICAgIH07XG5cbiAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBjaGlsZCBpbiBzdWJzY3JpYmVyLmNoaWxkcmVuKSB7XG4gICAgICAgIHN1YnNjcmliZXIuY2hpbGRyZW5bY2hpbGRdLnVuc3Vic2NyaWJlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzdWJzY3JpYmVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgYW5kIHN1YnNjcmliZSBhIHNpbmdsZSBET00gbm9kZSB1c2luZyBhIGN1c3RvbSBjcmVhdGlvbiBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjcmVhdGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBzdWJzY3JpYmVUZXh0ID0gZnVuY3Rpb24gKGZuLCBjcmVhdGUpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKGZuKTtcbiAgICB2YXIgbm9kZSAgICAgICAgID0gY3JlYXRlKHN1YnNjcmlwdGlvbigpKTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIG5vZGUudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuIFRoaXMgbWV0aG9kIHJlcXVpcmVzIGFcbiAgICogY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGFueSBlbGVtZW50IGNoYW5nZXMgc2luY2UgeW91IGNhbid0IGNoYW5nZSBhIHRhZ1xuICAgKiBuYW1lIGluIHBsYWNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNiXG4gICAqIEByZXR1cm4ge0VsZW1lbnR9XG4gICAqL1xuICBWTS5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKGZuLCBjYikge1xuICAgIHZhciBzdWJzY3JpcHRpb24gPSBWTS5zdWJzY3JpYmUoZm4pO1xuICAgIHZhciBlbCAgICAgICAgICAgPSBVdGlscy5jcmVhdGVFbGVtZW50KHN1YnNjcmlwdGlvbigpKTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGNiKGVsID0gVXRpbHMuY29weUFuZFJlcGxhY2VOb2RlKFV0aWxzLmNyZWF0ZUVsZW1lbnQodmFsdWUpLCBlbCkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gZWw7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBlbGVtZW50cyBhdHRyaWJ1dGUuIFdlIGFjY2VwdCB0aGUgY3VycmVudCBlbGVtZW50IGEgZnVuY3Rpb25cbiAgICogYmVjYXVzZSB3aGVuIGEgdGFnIG5hbWUgY2hhbmdlcyB3ZSB3aWxsIGxvc2UgcmVmZXJlbmNlIHRvIHRoZSBhY3RpdmVseVxuICAgKiByZW5kZXJlZCBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBlbGVtZW50Rm5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmFtZUZuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHZhbHVlRm5cbiAgICovXG4gIFZNLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50Rm4sIG5hbWVGbiwgdmFsdWVGbikge1xuICAgIHZhciBuYW1lU3Vic2NyaXB0aW9uICA9IFZNLnN1YnNjcmliZShuYW1lRm4pO1xuICAgIHZhciB2YWx1ZVN1YnNjcmlwdGlvbiA9IFZNLnN1YnNjcmliZSh2YWx1ZUZuKTtcblxuICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhlIGN1cnJlbnQgbmFtZSBhbmQgdmFsdWUgd2l0aG91dCBoYXZpbmcgdG8gcmUtcnVuIHRoZVxuICAgIC8vIGZ1bmN0aW9uIGV2ZXJ5IHRpbWUgc29tZXRoaW5nIGNoYW5nZXMuXG4gICAgdmFyIGF0dHJOYW1lICA9IG5hbWVTdWJzY3JpcHRpb24oKTtcbiAgICB2YXIgYXR0clZhbHVlID0gdmFsdWVTdWJzY3JpcHRpb24oKTtcblxuICAgIG5hbWVTdWJzY3JpcHRpb24udXBkYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBVdGlscy5yZW1vdmVBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lKTtcbiAgICAgIFV0aWxzLnNldEF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUgPSB2YWx1ZSwgYXR0clZhbHVlKTtcbiAgICB9O1xuXG4gICAgdmFsdWVTdWJzY3JpcHRpb24udXBkYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBVdGlscy5zZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lLCBhdHRyVmFsdWUgPSB2YWx1ZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBVdGlscy5zZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lLCBhdHRyVmFsdWUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBET00gZWxlbWVudCBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFZNLmNyZWF0ZURPTSA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBzdWJzY3JpcHRpb24gPSBWTS5zdWJzY3JpYmUoZm4pO1xuXG4gICAgLy8gV2UgbmVlZCB0byBhZGQgYSBiZWZvcmUgYW5kIGFmdGVyIGVsZW1lbnQgcGxhY2Vob2xkZXIgc2luY2UgdGhlIHBpZWNlc1xuICAgIC8vIGluIGJldHdlZW4gY2FuIGJlIGVuYWJsZWQgYW5kIGRpc2FibGVkIHJhbmRvbWx5LlxuICAgIHZhciBwbGFjZWhvbGRlciA9IHtcbiAgICAgIGFmdGVyOiAgZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpLFxuICAgICAgYmVmb3JlOiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJylcbiAgICB9O1xuXG4gICAgLy8gQ3JlYXRlIGEgZnVuY3Rpb24gdG8ga2VlcCB0cmFjayBvZiBkb2N1bWVudCBmcmFnbWVudCBjaGlsZHJlbi5cbiAgICB2YXIgZ2VuZXJhdGUgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgICAvLyBUbyBrZWVwIHRyYWNrIG9mIHRoZSBpbnNlcnRpb25zIGFuZCBkZWxldGlvbnMgYWNjdXJhdGVseSB3ZSBuZWVkIHRvXG4gICAgICAvLyBhZGQgcGxhY2Vob2xkZXIgRE9NIGVsZW1lbnRzLlxuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQocGxhY2Vob2xkZXIuYmVmb3JlKTtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKFV0aWxzLmRvbWlmeUV4cHJlc3Npb24odGV4dCkpO1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQocGxhY2Vob2xkZXIuYWZ0ZXIpO1xuXG4gICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBwYXJlbnROb2RlID0gcGxhY2Vob2xkZXIuYmVmb3JlLnBhcmVudE5vZGU7XG4gICAgICB2YXIgY2hpbGROb2RlcyA9IHBhcmVudE5vZGUuY2hpbGROb2RlcztcblxuICAgICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBjaGlsZCBub2RlcyB0byByZW1vdmUgdGhlIGF0dGFjaGVkIGNoaWxkcmVuLlxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJlbnROb2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gV2hlbiB3ZSBmaW5kIHRoZSBgYmVmb3JlYCBwbGFjZWhvbGRlciBub2RlLCBzdGFydCByZW1vdmluZyBhbGxcbiAgICAgICAgLy8gdGhlIGNoaWxkIG5vZGVzIHVudGlsIHdlIGhpdCB0aGUgYGFmdGVyYCBwbGFjZWhvbGRlciBub2RlLlxuICAgICAgICBpZiAoY2hpbGROb2Rlc1tpXSA9PT0gcGxhY2Vob2xkZXIuYmVmb3JlKSB7XG4gICAgICAgICAgZG8ge1xuICAgICAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjaGlsZE5vZGVzW2ldKTtcbiAgICAgICAgICB9IHdoaWxlIChjaGlsZE5vZGVzW2ldICE9PSBwbGFjZWhvbGRlci5hZnRlcik7XG5cbiAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBwbGFjZWhvbGRlci5hZnRlci5uZXh0U2libGluZztcbiAgICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShnZW5lcmF0ZSh2YWx1ZSksIG5leHRTaWJsaW5nKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZ2VuZXJhdGUoc3Vic2NyaXB0aW9uKCkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSB0ZXh0IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge1RleHR9XG4gICAqL1xuICBWTS5jcmVhdGVUZXh0ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZVRleHQoZm4sIFV0aWxzLnRleHRpZnlFeHByZXNzaW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtDb21tZW50fVxuICAgKi9cbiAgVk0uY3JlYXRlQ29tbWVudCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBzdWJzY3JpYmVUZXh0KGZuLCBVdGlscy5jcmVhdGVDb21tZW50KTtcbiAgfTtcblxuICAvKipcbiAgICogR2VuZXJhdGUgYW4gZXhlY3V0YWJsZSB0ZW1wbGF0ZSBmcm9tIGEgdGVtcGxhdGUgc3BlYy5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIHRlbXBsYXRlU3BlY1xuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIFZNLnRlbXBsYXRlID0gRE9NQmFycy50ZW1wbGF0ZSA9IGZ1bmN0aW9uICh0ZW1wbGF0ZVNwZWMpIHtcbiAgICB2YXIgRE9NQmFycyA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgY29udGFpbmVyIG9iamVjdCBob2xkcyBhbGwgdGhlIGZ1bmN0aW9ucyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBzcGVjLlxuICAgICAqXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgaW52b2tlUGFydGlhbDogICAgVk0uaW52b2tlUGFydGlhbCxcbiAgICAgIHByb2dyYW1zOiAgICAgICAgIFtdLFxuICAgICAgbm9vcDogICAgICAgICAgICAgVk0ubm9vcCxcbiAgICAgIGNvbXBpbGVySW5mbzogICAgIG51bGwsXG4gICAgICBhcHBlbmRDaGlsZDogICAgICBVdGlscy5hcHBlbmRDaGlsZCxcbiAgICAgIGNyZWF0ZURPTTogICAgICAgIFZNLmNyZWF0ZURPTSxcbiAgICAgIGNyZWF0ZVRleHQ6ICAgICAgIFZNLmNyZWF0ZVRleHQsXG4gICAgICBzZXRBdHRyaWJ1dGU6ICAgICBWTS5zZXRBdHRyaWJ1dGUsXG4gICAgICBjcmVhdGVDb21tZW50OiAgICBWTS5jcmVhdGVDb21tZW50LFxuICAgICAgY3JlYXRlRWxlbWVudDogICAgVk0uY3JlYXRlRWxlbWVudCxcbiAgICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBWTS5wcm9ncmFtV2l0aERlcHRoXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgcHJvZ3JhbSBzaW5nbGV0b24gYmFzZWQgb24gaW5kZXguXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ9ICAgaVxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgICAqIEBwYXJhbSAge09iamVjdH0gICBkYXRhXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAgICovXG4gICAgY29udGFpbmVyLnByb2dyYW0gPSBmdW5jdGlvbiAoaSwgZm4sIGRhdGEpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG5cbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBWTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9ncmFtc1tpXSA9IFZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE1lcmdlIHR3byBvYmplY3RzIGludG8gYSBzaW5nbGUgb2JqZWN0LlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBwYXJhbVxuICAgICAqIEBwYXJhbSAge09iamVjdH0gY29tbW9uXG4gICAgICogQHJldHVybiB7T2JqZWN0fVxuICAgICAqL1xuICAgIGNvbnRhaW5lci5tZXJnZSA9IGZ1bmN0aW9uIChwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uKSB7XG4gICAgICAgIHJldCA9IHt9O1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCBhIHByb3BlcnR5IGZyb20gYW4gb2JqZWN0LiBQYXNzZXMgaW4gdGhlIG9iamVjdCBpZCAoZGVwdGgpIHRvIG1ha2UgaXRcbiAgICAgKiBtdWNoIGZhc3RlciB0byBkbyBjb21wYXJpc29ucyBiZXR3ZWVuIG5ldyBhbmQgb2xkIHN1YnNjcmlwdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICBjb250YWluZXIuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGlkKSB7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IFZNLnN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucztcblxuICAgICAgKHN1YnNjcmlwdGlvbnNbcHJvcGVydHldIHx8IChzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSA9IHt9KSlbaWRdID0gb2JqZWN0O1xuXG4gICAgICByZXR1cm4gRE9NQmFycy5nZXQob2JqZWN0LCBwcm9wZXJ0eSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7Tm9kZX1cbiAgICAgKi9cbiAgICByZXR1cm4gZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAvLyBTdWJzY3JpYmUgdG8gdGhlIHRlbXBsYXRlIHNwZWMgaW5zaWRlIHRoZSByZXR1cm5lZCBmdW5jdGlvbi4gVGhpcyBpcyBzb1xuICAgICAgLy8gdGhhdCAqZXZlcnkqIGdlbmVyYXRlZCBET00gdGVtcGxhdGUgd2lsbCBoYXZlIGEgZGlmZmVyZW50IHVuc3Vic2NyaWJlXG4gICAgICAvLyBtZXRob2QuXG4gICAgICB2YXIgc3Vic2NyaWJlciA9IFZNLnN1YnNjcmliZSh0ZW1wbGF0ZVNwZWMpO1xuXG4gICAgICB2YXIgcmVzdWx0ID0gc3Vic2NyaWJlci5jYWxsKFxuICAgICAgICBjb250YWluZXIsXG4gICAgICAgIERPTUJhcnMsXG4gICAgICAgIGNvbnRleHQsXG4gICAgICAgIG9wdGlvbnMuaGVscGVycyxcbiAgICAgICAgb3B0aW9ucy5wYXJ0aWFscyxcbiAgICAgICAgb3B0aW9ucy5kYXRhXG4gICAgICApO1xuXG4gICAgICAvLyBBdHRhY2ggdGhlIGN1cnJlbnQgb3BlcmF0aW5nIGNvbnRleHQgdG8gdGhlIFZNIG9iamVjdCBmb3IgcmVmZXJlbmNlXG4gICAgICAvLyB3aXRoaW4gdGhlIHV0aWxpdHkgZnVuY3Rpb25zLlxuICAgICAgVk0uY29udGV4dCA9IGNvbnRleHQ7XG5cbiAgICAgIC8vIEF0dGFjaCBhbiBgdW5zdWJzY3JpYmVgIGZ1bmN0aW9uIHRvIHRoZSByZXN1bHRpbmcgRE9NLlxuICAgICAgLy8gVE9ETzogQ29tZSB1cCB3aXRoIGFuIGltcHJvdmVkIHNvbHV0aW9uLlxuICAgICAgcmVzdWx0LnVuc3Vic2NyaWJlID0gc3Vic2NyaWJlci51bnN1YnNjcmliZTtcblxuICAgICAgdmFyIGNvbXBpbGVySW5mbyAgICAgPSBjb250YWluZXIuY29tcGlsZXJJbmZvIHx8IFtdO1xuICAgICAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm9bMF0gfHwgMTtcbiAgICAgIHZhciBjdXJyZW50UmV2aXNpb24gID0gRE9NQmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgID0gRE9NQmFycy5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl07XG4gICAgICAgICAgdmFyIGNvbXBpbGVyVmVyc2lvbnMgPSBET01CYXJzLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mICcgK1xuICAgICAgICAgICAgJ0RPTUJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXInICtcbiAgICAgICAgICAgICcgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgcnVudGltZVZlcnNpb25zICsgJykgb3IgZG93bmdyYWRlIHlvdXIgJyArXG4gICAgICAgICAgICAncnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uICgnICsgY29tcGlsZXJWZXJzaW9ucyArICcpJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZicgK1xuICAgICAgICAgICdET01CYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gJyArXG4gICAgICAgICAgJ2EgbmV3ZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVySW5mb1sxXSArICcpJyk7XG4gICAgICB9XG5cbiAgICAgIFZNLmNvbnRleHQgPSBudWxsO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgcmV0dXJuIERPTUJhcnM7XG59O1xuIiwidmFyIHV0aWxzICAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscycpO1xudmFyIGV2ZW50cyAgID0gcmVxdWlyZSgnLi9jb21waWxlci9ldmVudHMnKTtcbnZhciB1bmlxdWVJZCA9IDA7XG5cbi8qKlxuICogQXR0YWNoIHJldXNhYmxlIHV0aWxpdHkgZnVuY3Rpb25zIHRvIHRoZSBET01CYXJzIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gRE9NQmFyc1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uIChET01CYXJzKSB7XG4gIHZhciBVdGlscyA9IHV0aWxzLmF0dGFjaChET01CYXJzKS5VdGlscztcblxuICAvLyBFeHRlbmQgdGhlIERPTUJhcnMgcm9vdCBvYmplY3Qgd2l0aCBhbiBldmVudCBlbWl0dGVyLlxuICBET01CYXJzLlV0aWxzLmV4dGVuZChET01CYXJzLCBldmVudHMpO1xuXG4gIC8qKlxuICAgKiBTaW1wbGUgZnVuY3Rpb24gd3JhcHBlciB0aGF0IHdpbGwgZW1pdCB0aGUgZXZlbnQgd2l0aCB0aGUgcmVzdWx0IG9mIHRoZVxuICAgKiBmdW5jdGlvbiBleGVjdXRpb24gZXZlcnkgdGltZSB0aGUgZnVuY3Rpb24gaXMgcnVuLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7U3RyaW5nfSAgIGV2ZW50XG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgdmFyIGVtaXR0ZXIgPSBmdW5jdGlvbiAoZm4sIGV2ZW50KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgRE9NQmFycy5lbWl0KGV2ZW50LCByZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSB1bmlxdWUgaWQuXG4gICAqXG4gICAqIEByZXR1cm4ge051bWJlcn1cbiAgICovXG4gIFV0aWxzLnVuaXF1ZUlkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB1bmlxdWVJZCsrO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGFuIG9iamVjdCBpcyBhY3R1YWxseSBhIERPTSBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0gIHsqfSAgICAgICBlbGVtZW50XG4gICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAqL1xuICBVdGlscy5pc05vZGUgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50IGluc3RhbmNlb2YgTm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgZnJvbSBhIHRhZyBuYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFV0aWxzLmNyZWF0ZUVsZW1lbnQgPSBlbWl0dGVyKGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH0sICdjcmVhdGVFbGVtZW50Jyk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGNvbW1lbnQgbm9kZSBiYXNlZCBvbiB0ZXh0IGNvbnRlbnRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRlbnRzXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBVdGlscy5jcmVhdGVDb21tZW50ID0gZW1pdHRlcihmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChjb250ZW50cyk7XG4gIH0sICdjcmVhdGVDb21tZW50Jyk7XG5cbiAgLyoqXG4gICAqIENvcHkgYWxsIHNpZ25pZmljYW50IGRhdGEgZnJvbSBvbmUgZWxlbWVudCBub2RlIHRvIGFub3RoZXIuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVXRpbHMuY29weU5vZGUgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICAgIC8vIE1vdmUgYWxsIGNoaWxkIGVsZW1lbnRzIHRvIHRoZSBuZXcgbm9kZS5cbiAgICB3aGlsZSAob2xkTm9kZS5maXJzdENoaWxkKSB7XG4gICAgICBuZXdOb2RlLmFwcGVuZENoaWxkKG9sZE5vZGUuZmlyc3RDaGlsZCk7XG4gICAgfVxuXG4gICAgLy8gQ29weSBhbGwgdGhlIGF0dHJpYnV0ZXMgdG8gdGhlIG5ldyBub2RlLlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2xkTm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0cmlidXRlID0gb2xkTm9kZS5hdHRyaWJ1dGVzW2ldO1xuICAgICAgVXRpbHMuc2V0QXR0cmlidXRlKG5ld05vZGUsIGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVXRpbHMuY29weUFuZFJlcGxhY2VOb2RlID0gZnVuY3Rpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgICBvbGROb2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKFV0aWxzLmNvcHlOb2RlKG5ld05vZGUsIG9sZE5vZGUpLCBvbGROb2RlKTtcbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IGFuIGF0dHJpYnV0ZSB2YWx1ZSBvbiBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9ICAgZWxlbWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0geyp9ICAgICAgdmFsdWVcbiAgICovXG4gIFV0aWxzLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBVdGlscy5yZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgbmFtZSk7XG4gICAgfVxuXG4gICAgRE9NQmFycy5lbWl0KCdzZXRBdHRyaWJ1dGUnLCBlbGVtZW50LCBuYW1lLCB2YWx1ZSk7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW4gYXR0cmlidXRlIGZyb20gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICovXG4gIFV0aWxzLnJlbW92ZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBuYW1lKSB7XG4gICAgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlKG5hbWUpKSB7XG4gICAgICBET01CYXJzLmVtaXQoJ3JlbW92ZUF0dHJpYnV0ZScsIGVsZW1lbnQsIG5hbWUpO1xuICAgICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBlbmQgYSBjaGlsZCBlbGVtZW50IHRvIGEgRE9NIG5vZGUuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gcGFyZW50XG4gICAqIEBwYXJhbSB7Tm9kZX0gY2hpbGRcbiAgICovXG4gIFV0aWxzLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGQpIHtcbiAgICBpZiAoY2hpbGQgPT0gbnVsbCkgeyByZXR1cm47IH1cblxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgRE9NQmFycy5lbWl0KCdhcHBlbmRDaGlsZCcsIHBhcmVudCwgY2hpbGQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhcmJpdHJhcnkgRE9NIG5vZGVzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVXRpbHMuZG9taWZ5RXhwcmVzc2lvbiA9IGVtaXR0ZXIoZnVuY3Rpb24gKHN0cmluZykge1xuICAgIGlmIChzdHJpbmcgPT0gbnVsbCB8fCBzdHJpbmcgPT09ICcnKSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIH1cblxuICAgIGlmIChVdGlscy5pc05vZGUoc3RyaW5nKSkge1xuICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmlubmVySFRNTCA9IHN0cmluZztcblxuICAgIGlmIChkaXYuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHJldHVybiBkaXYucmVtb3ZlQ2hpbGQoZGl2LmNoaWxkTm9kZXNbMF0pO1xuICAgIH1cblxuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgIHdoaWxlIChkaXYuZmlyc3RDaGlsZCkge1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICAgIH1cblxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfSwgJ2RvbWlmeScpO1xuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhIERPTSB0ZXh0IG5vZGUgZm9yIGFwcGVuZGluZyB0byB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIEBwYXJhbSAge1N0cmluZ30gc3RyaW5nXG4gICAqIEByZXR1cm4ge1RleHR9XG4gICAqL1xuICBVdGlscy50ZXh0aWZ5RXhwcmVzc2lvbiA9IGVtaXR0ZXIoZnVuY3Rpb24gKHN0cmluZykge1xuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBET01CYXJzLlNhZmVTdHJpbmcpIHtcbiAgICAgIHJldHVybiBVdGlscy5kb21pZnlFeHByZXNzaW9uKHN0cmluZy50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICAvLyBDYXRjaCB3aGVuIHRoZSBzdHJpbmcgaXMgYWN0dWFsbHkgYSBET00gbm9kZSBhbmQgdHVybiBpdCBpbnRvIGEgc3RyaW5nLlxuICAgIGlmIChVdGlscy5pc05vZGUoc3RyaW5nKSkge1xuICAgICAgaWYgKHN0cmluZy5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHN0cmluZy5vdXRlckhUTUwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcub3V0ZXJIVE1MKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmFwcGVuZENoaWxkKHN0cmluZy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRpdi5pbm5lckhUTUwpO1xuICAgIH1cblxuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcgPT0gbnVsbCA/ICcnIDogc3RyaW5nKTtcbiAgfSwgJ3RleHRpZnknKTtcblxuICByZXR1cm4gRE9NQmFycztcbn07XG4iLCIvKmpzaGludCBlcW51bGw6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG5cbnZhciBIYW5kbGViYXJzID0ge307XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVkVSU0lPTiA9IFwiMS4wLjBcIjtcbkhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuXG5IYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuXG5IYW5kbGViYXJzLmhlbHBlcnMgID0ge307XG5IYW5kbGViYXJzLnBhcnRpYWxzID0ge307XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZnVuY3Rpb25UeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIgPSBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwgPSBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuXG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbih0aGlzKTtcbiAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLksgPSBmdW5jdGlvbigpIHt9O1xuXG5IYW5kbGViYXJzLmNyZWF0ZUZyYW1lID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgdmFyIG9iaiA9IG5ldyBIYW5kbGViYXJzLksoKTtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG51bGw7XG4gIHJldHVybiBvYmo7XG59O1xuXG5IYW5kbGViYXJzLmxvZ2dlciA9IHtcbiAgREVCVUc6IDAsIElORk86IDEsIFdBUk46IDIsIEVSUk9SOiAzLCBsZXZlbDogMyxcblxuICBtZXRob2RNYXA6IHswOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJ30sXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKEhhbmRsZWJhcnMubG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gSGFuZGxlYmFycy5sb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLmxvZyA9IGZ1bmN0aW9uKGxldmVsLCBvYmopIHsgSGFuZGxlYmFycy5sb2dnZXIubG9nKGxldmVsLCBvYmopOyB9O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICBkYXRhID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICB9XG5cbiAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICBpZihjb250ZXh0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZihkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IDApe1xuICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbmRpdGlvbmFsKTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKCFjb25kaXRpb25hbCB8fCBIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm59KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKCFIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICBIYW5kbGViYXJzLmxvZyhsZXZlbCwgY29udGV4dCk7XG59KTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZNID0ge1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGVTcGVjKSB7XG4gICAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgaW52b2tlUGFydGlhbDogSGFuZGxlYmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICAgIH0sXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24pIHtcbiAgICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBIYW5kbGViYXJzLlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgICBub29wOiBIYW5kbGViYXJzLlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IG51bGxcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKGNvbnRhaW5lciwgSGFuZGxlYmFycywgY29udGV4dCwgb3B0aW9ucy5oZWxwZXJzLCBvcHRpb25zLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEpO1xuXG4gICAgICB2YXIgY29tcGlsZXJJbmZvID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXSxcbiAgICAgICAgICBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgICAgY3VycmVudFJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG5cbiAgcHJvZ3JhbVdpdGhEZXB0aDogZnVuY3Rpb24oaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gMDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgbm9vcDogZnVuY3Rpb24oKSB7IHJldHVybiBcIlwiOyB9LFxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICAgIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICAgIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoIUhhbmRsZWJhcnMuY29tcGlsZSkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBIYW5kbGViYXJzLmNvbXBpbGUocGFydGlhbCwge2RhdGE6IGRhdGEgIT09IHVuZGVmaW5lZH0pO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy50ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuVk0udGVtcGxhdGU7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcblxufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbkhhbmRsZWJhcnMuRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59O1xuSGFuZGxlYmFycy5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5IYW5kbGViYXJzLlNhZmVTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59O1xuSGFuZGxlYmFycy5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmcudG9TdHJpbmcoKTtcbn07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG52YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufTtcblxuSGFuZGxlYmFycy5VdGlscyA9IHtcbiAgZXh0ZW5kOiBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlc2NhcGVFeHByZXNzaW9uOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIEhhbmRsZWJhcnMuU2FmZVN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwgfHwgc3RyaW5nID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gc3RyaW5nLnRvU3RyaW5nKCk7XG5cbiAgICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuICB9LFxuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmKHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXldXCIgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsIlxuLyoqXG4gKiBFeHBvc2UgYHJlcXVlc3RBbmltYXRpb25GcmFtZSgpYC5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgZmFsbGJhY2s7XG5cbi8qKlxuICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24uXG4gKi9cblxudmFyIHByZXYgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbmZ1bmN0aW9uIGZhbGxiYWNrKGZuKSB7XG4gIHZhciBjdXJyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIHZhciBtcyA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnIgLSBwcmV2KSk7XG4gIHNldFRpbWVvdXQoZm4sIG1zKTtcbiAgcHJldiA9IGN1cnI7XG59XG5cbi8qKlxuICogQ2FuY2VsLlxuICovXG5cbnZhciBjYW5jZWwgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cub0NhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5tc0NhbmNlbEFuaW1hdGlvbkZyYW1lO1xuXG5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKGlkKXtcbiAgY2FuY2VsLmNhbGwod2luZG93LCBpZCk7XG59O1xuIiwidmFyIGJhc2UgICAgID0gcmVxdWlyZSgnLi9saWIvYmFzZScpO1xudmFyIHV0aWxzICAgID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBydW50aW1lICA9IHJlcXVpcmUoJy4vbGliL3J1bnRpbWUnKTtcblxuLyoqXG4gKiBHZW5lcmF0ZSB0aGUgYmFzZSBET01CYXJzIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIGNyZWF0ZSAoKSB7XG4gIHZhciBET01CYXJzID0gYmFzZS5jcmVhdGUoKTtcblxuICB1dGlscy5hdHRhY2goRE9NQmFycyk7XG4gIHJ1bnRpbWUuYXR0YWNoKERPTUJhcnMpO1xuXG4gIERPTUJhcnMuY3JlYXRlID0gY3JlYXRlO1xuXG4gIHJldHVybiBET01CYXJzO1xufSkoKTtcbiJdfQ==
(9)
});
;