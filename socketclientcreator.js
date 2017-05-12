function createTCPClient(lib, Client, talkerFactory){
  'use strict';
  var q = lib.q;
  var _socketClientCount = 0, _id = 0;
  function SocketClient(address, port, session, credentials) {
    this.id = ++_id;
    //console.log(process.pid, 'new SocketClient', this.id, ++_socketClientCount, address, port);
    this.address = address;
    this.port = port;
    Client.call(this, session, credentials);
  }
  lib.inherit(SocketClient, Client);
  SocketClient.prototype.__cleanUp = function () {
    //console.log(process.pid, 'SocketClient dead', this.id, --_socketClientCount, this.address, this.port);
    Client.prototype.__cleanUp.call(this);
    this.port = null;
    this.address = null;
  };
  SocketClient.prototype.createTalker = function () {
    var ret = talkerFactory('initiatingsocket', this.address, this.port);
    ret.then(null, this.destroy.bind(this));
    return ret;
  };

  return SocketClient;
}

module.exports = createTCPClient;
