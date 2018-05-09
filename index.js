'use strict'

const through = require('through2')
const split = require('split2')
const pumpify = require('pumpify')

const createCodeCreation = require('./lib/core-events/code-creation')
const createSharedLibrary = require('./lib/core-events/shared-library')
const createCodeMove = require('./lib/core-events/code-move')
const createCodeDelete = require('./lib/core-events/code-delete')
const createTick = require('./lib/core-events/tick')

const createCodeSourceInfo = require('./lib/source-code-events/code-source-info')
const createScript = require('./lib/source-code-events/script')

module.exports = proffer

function proffer (opts = {}) {
  const state = {
    code: {},
    addresses: [],
    scripts: {},
    opts: Object.assign({}, opts, {
      nm: 'nm',
      warn: process.emitWarning.bind(process),
    })
  }

  const codeCreation = createCodeCreation(state)
  const sharedLibrary = createSharedLibrary(state)
  const codeMove = createCodeMove(state)
  const codeDelete = createCodeDelete(state)
  const tick = createTick(state)
  const codeSourceInfo = createCodeSourceInfo(state)
  const script = createScript(state)

  const parser = through.obj((line, _, cb) => {
    const row = line.toString().split(',')
    const [ event ] = row
    switch (event) {
      case 'tick':
        tick(row, cb)
        return
      case 'code-creation':
        codeCreation(row, cb)
        return
      case 'shared-library':
        sharedLibrary(row, cb)
        return
      case 'code-move':
        codeMove(row, cb)
        return
      case 'sfi-move':
        codeMove(row, cb)
        return
      case 'code-delete':
        codeDelete(row, cb)
        return
      case 'script':
        script(row, cb)
        return
      case 'code-source-info':
        codeSourceInfo(row, cb)
        return
    }

    return cb()
  })

  const stream = pumpify(split(), parser)
  stream._readableState.objectMode = true

  return stream
}
