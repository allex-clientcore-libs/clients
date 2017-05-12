function createWSClient(lib, Client, talkerFactory){
  'use strict';
  var q = lib.q, _wsClientCount = 0;
  function WSClient(connectionstring,address,port,session,credentials){
    //console.log(process.pid, 'new WSClient', address, port, ++_wsClientCount);
    this.connectionstring = connectionstring;
    this.address = address;
    this.port = port;
    Client.call(this,session,credentials);
  }
  lib.inherit(WSClient,Client);
  WSClient.prototype.__cleanUp = function(){
    /*
    console.trace();
    console.log('WSClient dying');
    */
    //console.log(process.pid, 'WSClient dead', this.address, this.port, --_wsClientCount);
    this.port = null;
    this.address = null;
    this.connectionstring = null;
    Client.prototype.__cleanUp.call(this);
  };
  WSClient.prototype.createTalker = function () {
    return talkerFactory('ws', this.connectionstring, this.address, this.port);
  };

  return WSClient;
}

module.exports = createWSClient;
