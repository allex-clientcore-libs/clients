function createWSClient(lib, HttpClientBase){
  'use strict';
  var q = lib.q, _wsClientCount = 0;
  function WSClient(connectionstring,address,port,session,credentials){
    HttpClientBase.call(this, connectionstring, address, port, session, credentials);
  }
  lib.inherit(WSClient,HttpClientBase);
  WSClient.prototype.ChannelCode = 'ws';

  return WSClient;
}

module.exports = createWSClient;
