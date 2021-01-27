import destroyObject from "../Core/destroyObject.js";

function noop() {}

/**
 * The credit display is responsible for displaying credits on screen.
 *
 * @param {HTMLElement} container The HTML element where credits will be displayed
 * @param {String} [delimiter= ' • '] The string to separate text credits
 * @param {HTMLElement} [viewport=document.body] The HTML element that will contain the credits popup
 *
 * @alias CreditDisplay
 * @constructor
 *
 * @example
 * var creditDisplay = new Cesium.CreditDisplay(creditContainer);
 */
function CreditDisplay(container, delimiter, viewport) {}

/**
 * Adds a credit to the list of current credits to be displayed in the credit container
 *
 * @param {Credit} credit The credit to display
 */
CreditDisplay.prototype.addCredit = noop;
/**
 * Adds credits that will persist until they are removed
 *
 * @param {Credit} credit The credit to added to defaults
 */
CreditDisplay.prototype.addDefaultCredit = noop;

/**
 * Removes a default credit
 *
 * @param {Credit} credit The credit to be removed from defaults
 */
CreditDisplay.prototype.removeDefaultCredit = noop;

CreditDisplay.prototype.showLightbox = noop;

CreditDisplay.prototype.hideLightbox = noop;

/**
 * Updates the credit display before a new frame is rendered.
 */
CreditDisplay.prototype.update = noop;

/**
 * Resets the credit display to a beginning of frame state, clearing out current credits.
 */
CreditDisplay.prototype.beginFrame = noop;

/**
 * Sets the credit display to the end of frame state, displaying credits from the last frame in the credit container.
 */
CreditDisplay.prototype.endFrame = noop;

/**
 * Destroys the resources held by this object.  Destroying an object allows for deterministic
 * release of resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
CreditDisplay.prototype.destroy = function () {
  return destroyObject(this);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 */
CreditDisplay.prototype.isDestroyed = function () {
  return false;
};

export default CreditDisplay;
