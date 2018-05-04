'use strict'

const { META } = require('../constants')

module.exports = codeSourceInfo

// [0] event (code-source-info)
// [1] addr (0x20c53997811a)
// [2] script id (56)
// [3] start position within script (13760)
// [4] end position within script (14124)
// [5] source position table (C0O0C1O0C7O1338)
//     C = code offset
//     S = script offset
//     I = inlining id
// [6] inlining table
//     F = function id
//     O = script offset
//     I = inlining id
// [7] function table
//     S = shared function info address

function codeSourceInfo (state) {
  const { scripts, opts } = state
  const { warn } = opts
  return function (row, cb) {
    const [
      event, addr, containingScriptId, start, end, positions, inlining, sharedFunctions
    ] = row
    if (!(containingScriptId in scripts)) {
      warn(`${event} script ${containingScriptId} not found`)
      cb()
      return
    }
    const { source } = scripts[containingScriptId]
    const code = state.code[parseInt(addr, 16)]
    if (!code) {
      warn(`${event} code address ${addr} not found`)
      cb()
      return
    }
    code.source = source.substring(start, end)
    code[META] = { start, end, source, containingScriptId, positions, inlining, sharedFunctions }
    cb()
  }
}
