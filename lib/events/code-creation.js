'use strict'

const sorted = require('sorted-array-functions')
const {
  KIND, START, SIZE, FUNC
} = require('../constants')

module.exports = codeCreation

// [0] event (code-creation)
// [1] tag (LazyCompile/Script)
// [2] kind (18)
// [3] timestamp (78727)
// [4] address start (0x2c7f8b9a40e2)
// [5] executable/instruction size (59)
// [6] frame description ("PerformanceObserverEntryList perf_hooks.js:186:14")
// [7] shared function address (0x2c7f8b99f828)
// [8] compute state (~ unoptimized, * optimized)

function codeCreation (state) {
  return function (line, cb) {
    const [ 
      event, tag, kind, ts, start, size, ...rest 
    ] = line.split(',')

    // Handler addresses get in the way, 
    // causing unhelpful tick address resolution 
    if (tag === 'Handler') {
      cb()
      return
    }

    var [ name, func, cs ] = rest
    if (name[0] === '"') {
      name = name.substr(1, name.length - 2)
    }
    const type = !func && !cs ? 'CODE' : 'JS'
    const entry = {
      name,
      tag,
      ts,
      cs,
      type, 
      [KIND]: kind, 
      [START]: start,
      [SIZE]: size,
      [FUNC]: func
    }
    const addr = parseInt(start, 16)
    if (addr in state.code) {
      // nameless frame duplicates are essentially noise
      if (name === '') {
        cb()
        return
      }
      if (entry.name !== state.code[addr].name) {
        state.code[addr].alts = state.code[addr].alts || []
        if (state.code[addr].alts.indexOf(state.code[addr].name) === -1) {
          state.code[addr].alts.push(state.code[addr].name)
        }
        state.code[addr].name = entry.name
      }
    } else {
      state.code[addr] = entry
      sorted.add(state.addresses, addr)
    }
    if (func) {
      const addr = parseInt(func, 16)
      if (!(addr in state.code)) {
        state.code[addr] = entry
        sorted.add(state.addresses, addr)
      }
    }
    cb()
  }
}
