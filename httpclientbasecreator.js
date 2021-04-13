function createHttpClientBase (lib, Client, talkerFactory) {
  'use strict';
  var q = lib.q, _httpClientBaseCount = 0;
  function HttpClientBase(connectionstring,address,port,session,credentials){
    //console.log(process.pid, 'new HttpClientBase', address, port, ++_httpClientBaseCount);
    this.connectionstring = connectionstring;
    this.address = address;
    this.port = port;
    Client.call(this,session,credentials);
  }
  lib.inherit(HttpClientBase,Client);
  HttpClientBase.prototype.__cleanUp = function(){
    /*
    console.trace();
    console.log('HttpClientBase dying');
    */
    //console.log(process.pid, 'HttpClientBase dead', this.address, this.port, --_httpClientBaseCount);
    this.port = null;
    this.address = null;
    this.connectionstring = null;
    Client.prototype.__cleanUp.call(this);
  };
  HttpClientBase.prototype.createTalker = function () {
    return talkerFactory(this.ChannelCode, this.connectionstring, this.address, this.port);
  };

  return HttpClientBase;
}
module.exports = createHttpClientBase;
