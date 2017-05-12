function createInProcClient(lib,Client,talkerFactory){
  'use strict';
  var q = lib.q, _inProcClientCount = 0;
  function InProcClient(inprocgate,session,credentials){
    //console.log(process.pid, 'new InProcClient', ++_inProcClientCount);
    this.gate = inprocgate;
    Client.call(this,session,credentials);
  }
  lib.inherit(InProcClient,Client);
  InProcClient.prototype.__cleanUp = function(){
    Client.prototype.__cleanUp.call(this);
    this.gate = null;
    //console.log(process.pid, 'InProcClient dead', --_inProcClientCount);
  };
  InProcClient.prototype.createTalker = function () {
    return q(talkerFactory('inproc', this.gate));
  };
  return InProcClient;
}

module.exports = createInProcClient;
