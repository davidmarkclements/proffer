'use strict'

const sorted = require('sorted-array-functions')
const createLoadSymbols = require('../load-symbols')
const { promisify } = require('util')
const { PC, IS_EXT_CB, EXT_CB_OR_TOS, FUNC } = require('../constants')

module.exports = tick

// [0] event (tick)
// [1] pc (0x100718563)
// [2] timestamp (87646)
// [3] external callback boolean (1)
// [4] external callback address OR top of stack address (0x100984270)
// [5] vm state (JS, GC, etc) (6)
// [...] stack addresses (0x10025a290,0x336f197394f1,0x336f19738ae4,0x336f19738039,0x336f68daf7f1,0x336f1973630f,0x336f1973182c)

// vm states:
// JS: 0,
// GC: 1,
// PARSER: 2,
// BYTECODE_COMPILER: 3,
// COMPILER: 4,
// OTHER: 5,
// EXTERNAL: 6,
// IDLE: 7,

function tick (state) {
  const loadSymbols = promisify(createLoadSymbols(state))
  return async function (line, cb) {
    const [ 
      event, pc, ts, isExtCb, extCbOrTos, vm, ...stack
    ] = line.split(',')
    
    if (vm !== '0') {
      cb()
      return 
    }

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
      stack[i] = state.code[codeAddr] || {name: stack[i]}

      if (stack[i].type === 'LIB') {
        await loadSymbols(stack[i])
        const codeAddr = state.addresses[sorted.lte(state.addresses, addr)]
        stack[i] = state.code[codeAddr]
      }
    }

    cb(null, {
      event, 
      [PC]: pc, 
      ts, 
      [IS_EXT_CB]: isExtCb, 
      [EXT_CB_OR_TOS]: extCbOrTos, 
      vm, 
      stack: stack.reverse()
    })
    
  }
}
