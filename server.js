var GUN = require("./gun-connection.js")
var SEA = GUN.SEA;

var Peer = require('simple-peer');
var wrtc = require('wrtc');

var gun = GUN()

gun.get("simple-peer")

var Peer = require('simple-peer')

var peer1 = new Peer({ initiator: true , wrtc: wrtc  })
var peer2 = new Peer({ initiator: false , wrtc: wrtc  })

peer1.on('signal', data => {
  // when peer1 has signaling data, give it to peer2 somehow
  peer2.signal(data)
})

peer2.on('signal', data => {
  // when peer2 has signaling data, give it to peer1 somehow
  peer1.signal(data)
})

peer1.on('connect', () => {
  // wait for 'connect' event before using the data channel
  peer1.send('hey peer2, how is it going?')
})

peer2.on('data', data => {
  // got a data channel message
  console.log('got a message from peer1: ' + data)
})

// console.log(gun);