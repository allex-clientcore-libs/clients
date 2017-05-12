function createChildProcClient(lib, Client, talkerFactory) {
  'use strict';
  var q = lib.q, _childProcessClientCount = 0;
  function ChildProcessClient(jstofork, options) {
    //console.log('ChildProcessClient', process.pid, jstofork, options);
    //console.log(process.pid, 'new ChildProcessClient', ++_childProcessClientCount);
    this.jstofork = jstofork;
    this.options = options;
    Client.call(this, process.pid + '');
  }
  lib.inherit(ChildProcessClient, Client);
  ChildProcessClient.prototype.__cleanUp = function () {
    Client.prototype.__cleanUp.call(this);
    this.options = null;
    this.jstofork = null;
    //console.log(process.pid, 'ChildProcessClient dead');//, --_childProcessClientCount);
  };
  ChildProcessClient.prototype.createTalker = function () {
    return q(talkerFactory('proc', this.jstofork, this.options));
  };
  ChildProcessClient.prototype.communicationType = 'child_process';
  return ChildProcessClient;
}

module.exports = createChildProcClient;
