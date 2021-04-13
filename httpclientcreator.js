function createHTTPClient(lib, HttpClientBase){
  'use strict';
  function HttpClient(connectionstring, address, port, session, credentials){
    HttpClientBase.call(this, connectionstring, address, port, session, credentials);
  }
  lib.inherit(HttpClient, HttpClientBase);
  HttpClient.prototype.ChannelCode = 'http';

  return HttpClient;
}

module.exports = createHTTPClient;
