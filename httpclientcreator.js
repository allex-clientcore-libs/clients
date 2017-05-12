function createHTTPClient(lib,Client,Talker){
  'use strict';
  function HttpClient(host,port, session, credentials){
    if (!host) throw 'Invalid host '+host;
    if (!port || isNaN(port) || port < 0) throw 'Invalid port number '+port;
    Client.call(this, session, credentials);
    this.sender = new Talker(host,port,{json:true});
    this.receiver = new Talker(host,port,{json:true});
    this.receiver.destroyed.attachForSingleShot(this.destroy.bind(this));
    this._notsent_cntr = 0;
    this.__send('introduce',true);
  }
  lib.inherit(HttpClient,Client);
  HttpClient.prototype.__cleanUp = function(){
    this._notsent_cntr = null;
    this.receiver.destroy();
    this.receiver = null;
    this.sender.destroy();
    this.sender = null;
    Client.prototype.__cleanUp.call(this);
  };
  HttpClient.MAX_NOT_SENT_CNT = 3;
  HttpClient.prototype.onIdentity = function(session,name){
    var dodado = !this.identity.established();
    Client.prototype.onIdentity.call(this,session,name);
    if(dodado){
      this.askForIncoming();
    }
  };
  HttpClient.prototype.onHttpData = function(data){
    this._notsent_cntr = 0;
    this.onIncoming(data);
  };

  HttpClient.prototype.onHttpError = function (data, reason) {
    if (this.identity.established()) {
      this.destroy();
      return;
    }

    this._notsent_cntr++;
    if (this._notsent_cntr >= HttpClient.MAX_NOT_SENT_CNT) {
      this.destroy();
    }else{
      this._retry(data);
    }
  };
  HttpClient.prototype._retry = function (data) {
    setTimeout(this.send.bind(this, data), 1000);
  };
  HttpClient.prototype.send = function(data){
    this.sender.tell('/proc',{q:JSON.stringify(data)}).done(this.onHttpData.bind(this), this.onHttpError.bind(this,data));
    data = null;
  };
  HttpClient.prototype.askForIncoming = function(){
    if(!this.identity.established()){
      return;
    }
    this.receiver.tell('/_',{q:JSON.stringify({identity:{session:this.identity.session}})}).done(this.onIncomingHttp.bind(this));
  };
  HttpClient.prototype.onIncomingHttp = function(data){
    data.forEach(this.onIncoming.bind(this));
    this.askForIncoming();
  };
  return HttpClient;
}

module.exports = createHTTPClient;
