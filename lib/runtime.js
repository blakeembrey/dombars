var hbsVM = require('handlebars/dist/cjs/handlebars/runtime');
var Utils = require('./utils');
var raf   = require('./raf');

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
