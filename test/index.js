const tape = require('tape')
const net = require('net')
const { augment } = require('../')

async function echoServer (port, packets) {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      const jsocket = augment(socket)

      // echo
      jsocket.on('packet', (packet) => {
        jsocket.send(packet)
      })
    })

    server.listen(port, () => resolve(server))
  })
}

function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

const PORT = 33333

tape('broken data test', (t) => {
  const server = net.createServer(async (socket) => {
    await sleep(50)
    socket.write(Buffer.from([19, 0]))
    await sleep(50)
    socket.write(Buffer.from([0, 0]))
    await sleep(50)
    socket.write(Buffer.from('{ "foo": null }', 'utf8'))
  })

  server.listen(PORT, () => {
    const socket = net.createConnection({ port: PORT })
    const jsock = augment(socket)

    t.plan(1)
    jsock.on('packet', (packet) => {
      t.deepEqual(packet, { foo: null })

      jsock.end()
      server.close()
    })
  })
})

tape('echo test', async (t) => {
  const server = await echoServer(PORT)
  const socket = net.createConnection({ port: PORT })
  const jsock = augment(socket)

  await new Promise((resolve) => {
    jsock.on('packet', (packet) => {
      t.deepEqual(packet, { foo: 'bar' })

      jsock.end()
      server.close(resolve)
    })

    jsock.send({ foo: 'bar' })
  })
})
