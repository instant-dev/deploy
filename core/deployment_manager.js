/**
 * Deploys to multiple providers
 */
class DeploymentManager {

  constructor () {
    this.__initialize__();
  }

  /**
   * @private
   */
  __initialize__ () {
    // do a thing
  }

  /**
   * @private
   */
  async __sleep__ (t) {
    return new Promise(r => setTimeout(() => r(true), t));
  }

};

module.exports = DeployManager;