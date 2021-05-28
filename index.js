var Url = require('url');

function createClientFactory(lib, talkerFactory){
  'use strict';
  var Client = require('./clientcreator')(lib),
    ChildProcClient = require('./childprocclientcreator')(lib, Client, talkerFactory),
    ParallelProcClient = require('./parallelprocclientcreator')(lib, Client, talkerFactory),
    SocketClient = require('./socketclientcreator')(lib, Client, talkerFactory),
    HttpClientBase = require('./httpclientbasecreator')(lib, Client, talkerFactory),
    WSClient = require('./wsclientcreator')(lib, HttpClientBase),
    HTTPClient = require('./httpclientcreator')(lib, HttpClientBase),
    InProcClient = require('./inprocclientcreator')(lib,Client,talkerFactory);

  function forkpathFrom (csurlobj){
    var forkpath = '';
    if(csurlobj.hostname){
      forkpath+=csurlobj.hostname;
    }
    if(csurlobj.pathname){
      forkpath+=csurlobj.pathname;
    }
    return forkpath;
  }

  function produceClient(connectionstring,credentials,session){
    var tocs = typeof connectionstring;
    if('string' !== tocs){
      if(connectionstring && connectionstring.authenticatorSink){
        return new (InProcClient)(connectionstring,session,credentials);
      }
      return null;
    }
    var csurlobj = Url.parse(connectionstring,true);
    switch(csurlobj.protocol){
      case 'fork:':
        return new (ChildProcClient)(forkpathFrom(csurlobj),csurlobj.query);
      case 'spawn:':
        return new (ParallelProcClient)(forkpathFrom(csurlobj),csurlobj.query);
      case 'socket:':
        return new (SocketClient)(csurlobj.hostname||csurlobj.pathname,csurlobj.port,session,credentials);
        break;
      case 'ws:':
      case 'wss:':
        return new (WSClient)(connectionstring,csurlobj.hostname||csurlobj.pathname,csurlobj.port,session,credentials);
        break;
      case 'http:':
      case 'https:':
        return new (HTTPClient)(connectionstring,csurlobj.hostname||csurlobj.pathname,csurlobj.port,session,credentials);
        break;
      default:
        throw new lib.UnsupportedProtocolError(csurlobj.protocol);
    }
  }

  return produceClient;
}

module.exports = createClientFactory;
