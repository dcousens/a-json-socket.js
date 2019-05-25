const net = require('net')
const EventEmitter = require('events').EventEmitter

function augment (socket) {
  const emitter = new EventEmitter()
  const wbuffer = Buffer.alloc(4)

  function die (err) {
    emitter.emit('end', err)
  }

  function send (data) {
    const json = JSON.stringify(data)

    wbuffer.writeUInt32LE(4 + json.length, 0)
    socket.write(wbuffer)
    socket.write(json)
  }

  function receive (data) {
    try {
      const parsed = JSON.parse(data.toString('utf8'))
      emitter.emit('json', parsed)
    } catch (e) {
      emitter.emit('error', new TypeError('Bad JSON'))
    }
  }

  let rbuffer = Buffer.alloc(0)

  socket.on('connect', () => emitter.emit('open'))
  socket.on('data', (data) => {
    rbuffer = Buffer.concat([rbuffer, data])

    // read JSON packets
    while (rbuffer.length > 0) {
      const length = rbuffer.readUInt32LE(0)

      if (rbuffer.length < length) break
      receive(rbuffer.slice(4, length))
      rbuffer = rbuffer.slice(length)
    }
  })

  socket.on('close', die)
  socket.on('end', die)
  socket.on('error', die)
  socket.on('timeout', die)

  emitter.send = send
  return emitter
}

function create (...options) {
  const socket = net.createConnection(...options)
  return augment(socket)
}

module.exports = {
  create,
  augment
}
