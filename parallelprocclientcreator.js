function createParallelProcClient(lib, Client, talkerFactory) {
  'use strict';
  var q = lib.q, _ParallelProcessClientCount = 0;
  function ParallelProcessClient(jstospawn, options) {
    //console.log('ParallelProcessClient', process.pid, jstofork, options);
    //console.log(process.pid, 'new ParallelProcessClient', ++_ParallelProcessClientCount);
    this.jstospawn = jstospawn;
    this.options = options;
    Client.call(this, process.pid + '');
  }
  lib.inherit(ParallelProcessClient, Client);
  ParallelProcessClient.prototype.__cleanUp = function () {
    Client.prototype.__cleanUp.call(this);
    this.options = null;
    this.jstospawn = null;
    //console.log(process.pid, 'ParallelProcessClient dead');//, --_ParallelProcessClientCount);
  };
  ParallelProcessClient.prototype.createTalker = function () {
    return q(talkerFactory('externalproc', this.jstospawn, this.options));
  };
  ParallelProcessClient.prototype.communicationType = 'parallel_process';
  return ParallelProcessClient;
}

module.exports = createParallelProcClient;
