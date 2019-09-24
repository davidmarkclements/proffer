'use strict'

const sorted = require('sorted-array-functions')
const createLoadSymbols = require('../load-symbols')
const { promisify } = require('util')
const { PC, IS_EXT_CB, EXT_CB_OR_TOS, VM_STATE, FUNC } = require('../constants')

module.exports = tick

// [0] event (tick)
// [1] pc (0x100718563)
// [2] timestamp (87646)
// [3] external callback boolean (1)
// [4] external callback address OR top of stack address (0x100984270)
// [5] vm state (JS, GC, etc) (6)
// [...] stack addresses (0x10025a290,0x336f197394f1,0x336f19738ae4,0x336f19738039,0x336f68daf7f1,0x336f1973630f,0x336f1973182c)

function tick (state) {
  const loadSymbols = promisify(createLoadSymbols(state))
  return async function (row, cb) {
    const [
      event, pc, ts, isExtCb, extCbOrTos, vmState, ...stack
    ] = row

    if (isExtCb === '1') {
      stack.unshift(extCbOrTos)
    } else {
      stack.unshift(pc)
      const ix = sorted.lte(state.addresses, extCbOrTos)
      if (ix > -1) {
        const match = state.code[state.addresses[ix]]
        const isJsFunction = match[FUNC] && match.cs
        if (isJsFunction) stack.unshift(extCbOrTos)
      }
    }

    for (const i in stack) {
      var addr = parseInt(stack[i], 16)
      const codeAddr = state.addresses[sorted.lte(state.addresses, addr)]
      stack[i] = state.code[codeAddr] || { name: stack[i] }

      if (stack[i].type === 'LIB') {
        await loadSymbols(stack[i])
        const codeAddr = state.addresses[sorted.lte(state.addresses, addr)]
        stack[i] = state.code[codeAddr]
      }
    }

    const vm = vmMap(vmState)

    cb(null, {
      event,
      [PC]: pc,
      ts,
      [IS_EXT_CB]: isExtCb,
      [EXT_CB_OR_TOS]: extCbOrTos,
      [VM_STATE]: vmState,
      vm,
      stack: stack.reverse()
    })
  }
}

function vmMap (vmState) {
  switch (vmState) {
    case '0': return 'JS'
    case '1': return 'GC'
    case '2': return 'PARSER'
    case '3': return 'BYTECODE_COMPILER'
    case '4': return 'COMPILER'
    case '5': return 'OTHER'
    case '6': return 'EXTERNAL'
    case '7': return 'IDLE'
    default: return 'UNKNOWN'
  }
}
