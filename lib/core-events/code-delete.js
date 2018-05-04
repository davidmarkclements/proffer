'use strict'

const sorted = require('sorted-array-functions')

module.exports = codeDelete

// [0] event (code-delete)
// [1] start (0x2c7f8b9a40e2)

function codeDelete (state) {
  return function (row, cb) {
    const [ event, start ] = row
    const addr = parseInt(start, 16)
    const success = sorted.remove(state.addresses, addr)
    if (success === true) {
      state.code[addr] = undefined
      cb()
    } else {
      state.opts.warn(`${event} address ${start} not found`)
      cb()
    }
  }
}
