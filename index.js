const net = require('net')
const EventEmitter = require('events').EventEmitter

function augment (socket) {
  const emitter = new EventEmitter()

  function fin (err) {
    emitter.emit('end', err)
  }

  function send (data) {
    const json = JSON.stringify(data)

    const wbuffer = Buffer.alloc(4)
    wbuffer.writeUInt32LE(4 + json.length, 0)
    socket.write(wbuffer)
    socket.write(json)
  }

  function receive (data) {
    try {
      const parsed = JSON.parse(data.toString('utf8'))
      emitter.emit('message', parsed)
    } catch (e) {
      emitter.emit('error', e)
    }
  }

  let rbuffer = Buffer.alloc(0)

  socket.on('connect', () => emitter.emit('open'))
  socket.on('data', (data) => {
    rbuffer = Buffer.concat([rbuffer, data])

    // read length prefixed packets
    while (rbuffer.length >= 4) {
      const length = rbuffer.readUInt32LE(0)

      if (rbuffer.length < length) break
      receive(rbuffer.slice(4, length))
      rbuffer = rbuffer.slice(length)
    }
  })

  socket.on('close', fin)
  socket.on('end', fin)
  socket.on('error', fin)
  socket.on('timeout', fin)

  emitter.send = send
  emitter.end = () => socket.end()
  emitter.destroy = () => socket.destroy()
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
