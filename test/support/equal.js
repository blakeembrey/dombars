/* global DOMBars, expect */

var __slice = Array.prototype.slice;

/**
 * Check that two DOM elements match eachother.
 *
 * @param  {Element} a
 * @param  {Element} b
 * @return {Boolean}
 */
var matchingNodes = function (a, b) {
  // Check that the node types are equal. This will be the fastest way to fail.
  if (a.nodeType !== b.nodeType) {
    return false;
  }

  // The nodes are elements.
  if (a.nodeType === 1) {
    // Check that we have matching tag names (for elements).
    if (a.tagName !== b.tagName) {
      return false;
    }

    // Different number of attributes indicates a problem.
    if (a.attributes.length !== b.attributes.length) {
      return false;
    }

    // Iterate over the attributes and make sure they all match.
    for (var i = 0; i < a.attributes.length; i++) {
      var attribute = a.attributes[i].nodeName;

      if (a.getAttribute(attribute) !== b.getAttribute(attribute)) {
        return false;
      }
    }

    // Check the text content as a single check. This is required since our
    // templates will have a different way of tracking text nodes.
    if (a.textContent !== b.textContent) {
      return false;
    }

    // Iterate only over the children (avoiding text nodes).
    for (var j = 0; j < a.childNodes.length; j++) {
      // Skip over text nodes. These will be inaccurate in our templates.
      if (a.childNodes[i].nodeType === 3) {
        continue;
      }

      if (!matchingNodes(a.childNodes[j], b.childNodes[j])) {
        return false;
      }
    }
  }

  // Text nodes and comment nodes.
  if (a.nodeType === 3 || a.nodeType === 8) {
    return a.textContent === b.textContent;
  }

  return true;
};

/**
 * Compile a string into a template and return a validation function.
 *
 * @param  {String}   template
 * @return {Function}
 */
module.exports = function (template) {
  var output = document.createElement('div');

  // Append the compiled template directly to the div.
  output.appendChild(
    DOMBars.compile(template).apply(null, __slice.call(arguments, 1))
  );

  /**
   * Returns a new function that can be used to check the DOM contents match.
   *
   * @param  {String}  match
   * @return {Boolean}
   */
  return function (match) {
    var div = document.createElement('div');
    div.innerHTML = match;

    // Throw an assertion if we have a failure.
    return expect(matchingNodes(output, div)).to.be.ok;
  };
};
