'use strict'

module.exports = script

// [0] event (script)
// [1] script id (56)
// [2] file (internal/cluster/master.js,)
// [3] source (function (exports\x2C require\x2C ...

function script (state) {
  return function (row, cb) {
    const [
      /* event */, id, file, source = ''
    ] = row
    state.scripts[id] = {
      id,
      file,
      source: source.replace(/\\x2C/g, ',')
    }
    cb()
  }
}
