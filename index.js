'use strict'

const through = require('through2')
const split = require('split2')
const pumpify = require('pumpify')

const createCodeCreation = require('./lib/events/code-creation')
const createSharedLibrary = require('./lib/events/shared-library')
const createCodeMove = require('./lib/events/code-move')
const createCodeDelete = require('./lib/events/code-delete')
const createTick = require('./lib/events/tick')

module.exports = proffer

function proffer (opts = {}) {
  const state = {
    code: {},
    addresses: [],
    opts: {
      nm: 'nm', 
      warn: process.emitWarning.bind(process), 
      ...opts
    }
  }
  const codeCreation = createCodeCreation(state)
  const sharedLibrary = createSharedLibrary(state)
  const codeMove = createCodeMove(state)
  const codeDelete = createCodeDelete(state)
  const tick = createTick(state)
  const parser = through.obj((line, _, cb) => {
    line = line.toString()
    const event = line.substr(0, line.indexOf(','))
    switch (event) {
      case 'v8-version': 
        return cb()
      case 'code-creation':
        codeCreation(line, cb)
        return
      case 'shared-library':
        sharedLibrary(line, cb)
        return
      case 'code-move':
        codeMove(line, cb)
        return
      case 'sfi-move':
        codeMove(line, cb)
        return
      case 'code-delete':
        codeDelete(line, cb)
        return
      case 'tick':
        tick(line, cb)
        return
    }
    return cb()
  })

  const stream = pumpify(split(), parser)
  stream._readableState.objectMode = true

  return stream

}