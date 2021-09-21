function createClient(lib){
  'use strict';
  var q = lib.q, _ClientCount=0;
  function no__seriesCopier (obj, val, key) {
    if (key !== '__service') {
      obj.ret[key] = val;
    }
  }
  function safeCredentials(credentials) {
    if ('object' !== typeof credentials) {
      return null;
    }
    var ret = {}, nscobj = {ret: ret};
    lib.traverseShallow(credentials, no__seriesCopier.bind(null, nscobj));
    nscobj.ret = null;
    nscobj = null;
    return ret;
  }

  function ClientIdentity(session,credentials){
    this.talkerid = null;
    this.session = session||null;
    this.credentials = safeCredentials(credentials);
    if (credentials && credentials.ip && !credentials.ip.name) {
      console.trace();
      console.log('Y NO NAME?', credentials);
    }
    this.__established = false;
  }
  ClientIdentity.prototype.destroy = function(){
    this.__established = null;
    this.credentials = null;
    this.session = null;
    this.talkerid = null;
  };
  ClientIdentity.prototype.set = function(introduce){
    this.session = introduce.session;
    this.__established = !!this.session;
    this.credentials = null;
  };
  ClientIdentity.prototype.toIntroduceArray = function(){
    return [this.session, this.credentials ? this.credentials : null];
  };
  ClientIdentity.prototype.established = function(){
    return this.__established;
  };

  var dummyOOBSink = {
    destroy:lib.dummyFunc,
    onOOBData:lib.dummyFunc
  };
  function OOBSource(){
    this.oob = new lib.Fifo;
    this.oobsink = null;
  }
  OOBSource.prototype.destroy = function(){
    if (this.oob) {
      this.oob.destroy();
    }
    this.oob = null;
    this.oobsink = null;
  };
  OOBSource.prototype.unlinkAndDestroy = function(){
    this.destroy();
  };
  OOBSource.prototype.isGoingToDie = function(){
    return this.oobsink === dummyOOBSink;
  };
  OOBSource.prototype.takeExternalException = function (exception) {
    this.setOOBSink(dummyOOBSink);
    this.destroy(exception);
  };
  OOBSource.prototype.onOOBData = function(oob){
    if (!this.oob) {
      return;
    }
    if(oob[1] === '-'){
      //console.log(process.pid,'OOBSource dying',this.identity ? this.identity.session : 'no session');
      this.setOOBSink(dummyOOBSink);
      this.destroy();
      return;
    }
    if(this.oobsink){
      this.oobsink.onOOBData(oob);
    }else{
      try {
        this.oob.push(this.oobItemClone(oob));
      } catch (e) {
        console.trace();
        console.log('cannot clone oob', oob);
        console.log(oob);
        console.error(e.stack);
        console.error(e);
      }
    }
  };
  OOBSource.prototype.setOOBSink = function(oobsink){
    var _os;
    if(!this.oob){
      return;
    }
    if(oobsink){
      _os = oobsink;
      this.oob.drain(_os.onOOBData.bind(_os));
      _os = null;
    }
    this.oobsink = oobsink;
  };
  OOBSource.prototype.goDie = function () {
    this.destroy();
  };
  OOBSource.prototype.oobItemClone = function (item) {
    return item;
    //return JSON.parse(JSON.stringify(item));
  };
  // Specialized classes need to override
  // a method send that returns a promise.
  // setup a mechanism to fetch incoming data
  // and feed them to the onIncoming method
  function Client(session,credentials){
    //console.log(process.pid, 'new Client', ++_ClientCount);
    lib.ComplexDestroyable.call(this);
    OOBSource.call(this);
    this.q = new lib.Fifo();
    this.authenticated = new lib.HookCollection();
    this.children = new lib.Map();
    this.identity = new ClientIdentity(session,credentials);
    this.talker = null;
    this.dieExeced = false;
    //this.talkerDestroyedListener = null;
    this.obtainTalker().then(
      this.onTalker.bind(this),
      this.destroy.bind(this)
    );
  }
  lib.inherit(Client, lib.ComplexDestroyable);
  Client.prototype.takeExternalException = OOBSource.prototype.takeExternalException;
  Client.prototype.onOOBData = OOBSource.prototype.onOOBData;
  Client.prototype.setOOBSink = OOBSource.prototype.setOOBSink;
  Client.prototype.isGoingToDie = OOBSource.prototype.isGoingToDie;
  Client.prototype.oobItemClone = OOBSource.prototype.oobItemClone;
  Client.prototype.__cleanUp = function(){
    //console.log(process.pid,this.identity.session,'finally dying');
    var children = this.children, authenticated = this.authenticated;
     if (!children) {
      console.log('======================================================================return');
      return;
    }
    /*
    if (this.talkerDestroyedListener) {
      this.talkerDestroyedListener.destroy();
    }
    this.talkerDestroyedListener = null;
    */
    this.dieExeced = null;
    if (this.talker) {
      this.talker.remove(this);
    }
    this.talker = null;
    this.children = null;
    this.identity.destroy();
    this.identity = null;
    this.authenticated = null;
    this.q.destroy();
    this.q = null;
    OOBSource.prototype.destroy.call(this);
    lib.ComplexDestroyable.prototype.__cleanUp.call(this);
    if (children) {
      lib.containerDestroyAll(children);
    }
    if (authenticated) {
      authenticated.destruct();
    }
    //console.log(process.pid, 'Client down', --_ClientCount);
  };
  function deathTeller(client, session) {
    //client.onOOBData([session, '-', true]);
  }
  Client.prototype.startTheDyingProcedure = function () {
    if (!this.children) {
      return;
    }
    if (this.talker && this.talker.__dyingException) {
      this.__dyingException = this.talker.__dyingException;
    }
    this.children.traverse(deathTeller);
    //lib.containerDestroyAll(this.children);
  };
  Client.prototype.dyingCondition = function () {
    if (!this.children) {
      return true;
    }
    var ret = this.children.traverseConditionally(hasSession);
    if (ret) {
      //console.log(process.pid, 'Client cannot die yet, there are children');
      return false;
    }
    return true;
    //return this.children.length < 1;
  };
  function hasSession(chld){
    if(chld && chld.identity && chld.identity.session){
      return true;
    }
  }
  Client.prototype.dieExceptionally = function(exception){
    if(!this.destroyed){
      return;
    }
    this.destroy(exception);
  };
  function godier (c) {
    c.goDie();
  }
  Client.prototype.goDie = function(){
    /*
    if(this.isGoingToDie()){
      return;
    }
    */
    if(!this.children){
      return;
    }
    this.children.traverse(godier);
    //console.log(this.identity.session, 'going to die');
    //console.log(process.pid, 'Client wants to die');
    if (this.dieExeced === false) {
      this.dieExeced = true;
      this.exec(['!',['die', []]]).then(
        null,
        this.destroy.bind(this)
      );
    }
  };
  Client.prototype.obtainTalker = function () {
    if (this.talker) {
      return q(this.talker);
    }
    return this.createTalker();
  };
  Client.prototype.onTalker = function (talker) {
    if (!talker) {
      this.destroy();
      return;
    }
    this.talker = talker;
    if (!this.checkTalker()) {
      return;
    }
    //this.talkerDestroyedListener = this.talker.destroyed.attach(this.destroy.bind(this));
    this.talker.add(this).then(
      this.onIdentity.bind(this),
      this.destroy.bind(this)
    );
  };
  Client.prototype.checkTalker = function () {
    if (!this.talker) {
      return false;
    }
    if (!this.talker.destroyed) {
      return false;
    }
    if (this.talker.__dying) {
      if (this.talker.__dyingException) {
        this.destroy(this.talker.__dyingException);
      } else {
        this.destroy();
      }
      return false;
    }
    return true;
  };
  Client.prototype.onIdentity = function(introduce){
    if (!this.identity) {
      return;
    }
    if (!introduce) {
      this.destroy();
      return;
    }
    this.identity.set(introduce);
    var qi;
    if(this.identity.established()){
      this.authenticated.fire(this,introduce.modulename,introduce.role);
      this.q.drain(this.drainer.bind(this));
      //this.talker.onSent('exec');
    }
  };
  Client.prototype.drainer = function (qi) {
    var _d;
    if (!this.checkTalker()) {
      return;
    }
    _d = qi[1];
    this.talker.transfer(this, qi[0]).then(_d.resolve.bind(_d));
    _d = null;
  };
  Client.prototype.okToSend = function () {
    return this.identity.established();
  };
  Client.prototype.exec = function(callablespec){
    if (!this.q) {
      console.warn("I'm dead ... ");
      return q.reject(new lib.Error('ALREADY_DEAD', 'A destroyed Client cannot exec'));
    }
    if (!this.talker) {
      var d = q.defer();
      this.q.push([callablespec, d]);
      return d.promise;
    }
    if (!this.checkTalker()) {
      return q.reject(this.__dyingException);
    }
    return this.talker.transfer(this,callablespec);
  };
  function findPD(targetid,content){
    return content ? targetid===content.id : false;
  }
  Client.prototype.onSubConnected = function(subservicename,d,introducehash){
    try {
    if (!this.destroyed) {
      d.resolve(null);
      d = null;
      return;
    }
    //console.log('onSubConnected',subservicename,introducehash,this.identity.session);
    if(introducehash && introducehash.introduce){
      d.resolve({
        role:introducehash.introduce.role,
        servicepackname:introducehash.introduce.modulename,
        client:new SubClient(subservicename,introducehash.introduce,this._parent ? this._parent : this)});
    }else{
      d.resolve(null);
    }
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
    d = null;
  };
  Client.prototype.subConnect = function(subservicename,userhash,ctor){
    //console.trace();
    //console.log('subConnect',subservicename,userhash,process.pid);
    var d = q.defer(), ret = d.promise;
    this.exec(['!', ['subConnect', [subservicename,userhash]]]).done(
      this.onSubConnected.bind(this,subservicename,d),
      d.reject.bind(d)
    );
    d = null;
    return ret;
  };
  Client.prototype.onIncomingExecResult = function(incomingunit){
    if (!(incomingunit.id || incomingunit.oob)) {
      console.log('onIncomingExecResult', incomingunit);
    }
    if(!this.destroyed){
      return;
    }
    var iuid = incomingunit.id;
    if(!iuid){
      return;
    }
    var isess = incomingunit.session;
    if(this.identity.session && (this.identity.session!==isess)){
      var child = this.children.get(isess);
      if(child){
        child.onIncomingExecResult(incomingunit);
      } 
      return;
    } 
  };
  Client.prototype.setChild = function(chld){
    if(!(chld && chld.identity && chld.identity.session)){
      console.log('NOT TAKING THIS CHILD', chld);
      return;
    }
    if (!this.children) {
      return;
    }
    var session = chld.identity.session;
    var oldchld = this.children.replace(session,chld);
    if(oldchld && (oldchld !== chld)){
      oldchld.setOOBSink(chld);
      oldchld.unlinkAndDestroy();
    }
  };
  Client.prototype.removeChild = function(chld){
    if(!(this.children && chld && chld.identity && chld.identity.session)){
      return;
    }
    var session = chld.identity.session;
    this.children.remove(session);
    if(this.children.count<1) {
      this.maybeDie();
    }
  };

  var _subClientCount = 0;
  function SubClient(subservicename,introduce,parnt){
    //console.log('client introduced',subservicename,introduce);
    //console.log(process.pid, 'new SubClient', ++_subClientCount);
    this.subservicename = subservicename;
    this._parent = parnt;
    Client.call(this,introduce.session);
    //console.log('SubClient',introduce.session,this._parent.identity.session);
    this.identity.talkerid = introduce.session;
    this.identity.set(introduce,null);
    this._parent.setChild(this);
  };
  lib.inherit(SubClient,Client);
  SubClient.prototype.__cleanUp = function(){
    if(this._parent){
      this._parent.removeChild(this);
    }
    this._parent = null;
    this.subservicename = null;
    Client.prototype.__cleanUp.call(this);
    //console.log(process.pid, 'SubClient dead', --_subClientCount);
  };
  SubClient.prototype.onTalker = function (talker) {
    Client.prototype.onTalker.call(this, talker);
    this.exec(['!',['confirmReservation',[]]]).done(
      null,
      this.onConfirmReservationFailed.bind(this)
    );
  };
  SubClient.prototype.unlinkAndDestroy = function(){
    this._parent = null;
    this.destroy();
  };
  SubClient.prototype.onConfirmReservationFailed = function(reason){
    if (!this.destroyed) {
      return;
    }
    if (this.identity) {
      console.error(this.identity.session,'confirmReservation failed',reason);
    }
    this.destroy();
  };
  SubClient.prototype.obtainTalker = function () {
    return this._parent.obtainTalker();
  };

  return Client;
}

module.exports = createClient;
