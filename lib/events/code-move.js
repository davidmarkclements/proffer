'use strict'

const sorted = require('sorted-array-functions')
const { SIZE, START } = require('../constants')

module.exports = codeMove

// [0] event (code-move or sfi-move)
// [1] from (0x26a4f8f61610)
// [1] to (0x26a4120796b0)

// there is no difference in V8 internal implementation
// regarding sfi-move and code-move events *EXCEPT*
// that if from address is not found for code-move events
// and error is logged, but if it's not found for an sfi-move
// event, it's ignored.
// This implementation propagates a warning either way.

function codeMove (state) {
  const { opts } = state
  return function (line, cb) {
    const [ event, fromAddr, toAddr ] = line.split(',')
    const from = parseInt(fromAddr, 16)
    const to = parseInt(toAddr, 16)

    const index = sorted.lte(state.addresses, from)
    if (index === -1) {
      opts.warn(`${event} address ${fromAddr} not found`)
      cb()
      return
    }
    const entry = state.code[state.addresses[index]]
    const edge = to + entry[SIZE]

    sorted.remove(state.addresses, from)
    state.code[from] = undefined

    // clear out entries in what will be the new address range of the moved entry
    var addr = edge - 1
    while (addr >= to) {
      const ix = sorted.lte(state.addresses, addr)
      if (ix === -1) break
      const match = state.addresses[ix]
      addr = match - 1
      if (match + +state.code[match][SIZE] <= to) continue
      sorted.remove(state.addresses, match)
      state.code[match] = undefined
    }

    entry[START] = toAddr
    state.code[to] = entry
    sorted.add(state.addresses, to)

    cb()
  }
}
