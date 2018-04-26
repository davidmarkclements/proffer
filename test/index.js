'use strict'
const { test } = require('tap')
const { spawnSync } = require('child_process')
const { join } = require('path')
const { createReadStream, readFileSync } = require('fs')
const dedent = require('dedent')
const through = require('through2').obj
const pump = require('pump')
const proffer = require('..')

test('code-creation adds code which tick stack addresses resolve to on an lte basis', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('code-creation also handles V8 6.2 logs', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    end()
  })

  stream.write(dedent `
    v8-version,6,2,414,50,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,"FindMe"
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('code-creation CODE type', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    is(tick.stack[0].type, 'CODE', 'correct type')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('code-creation JS type', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    is(tick.stack[0].type, 'JS', 'correct type')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Script,3,104700,0x1cd8396af4a0,371,FindMe,0x2c7f8b99f828,*
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('code-creation JS type optimized', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    is(tick.stack[0].cs, '*', 'correct cs')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Script,3,104700,0x1cd8396af4a0,371,FindMe,0x2c7f8b99f828,*
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('code-creation JS type not optimized', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    is(tick.stack[0].cs, '~', 'correct cs')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Script,3,104700,0x1cd8396af4a0,371,FindMe,0x2c7f8b99f828,~
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('code-creation duplicates entries at shared function address when supplied', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe,0x1cd8396af400,*
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af401
    \n
  `)
})

test('code-creation will not duplicate entries at shared function address if address is already taken', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    // this scenario shouldn't happen (optimization status of shared function changed)
    // the contrived scenario is just used to check that a new entry isn't created
    is(tick.stack[0].cs, '*', 'shared function not re-added')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe,0x1cd8396af400,*
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe,0x1cd8396af400,~
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af401
    \n
  `)
})

test('code-creation skips Handler tags', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'Handler address ignored')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe
    code-creation,Handler,3,104700,0x1cd8396af4a1,371,IgnoreMe
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
})

test('code-creation ignores nameless duplicate frames', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'nameless duplicate ignored')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
})

test('code-creation replaces the name of a duplicate frame if the name is different, adding the original name to an `alt` array', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'AltName', 'address mapped to latest name')
    is(Array.isArray(tick.stack[0].alts), true, 'alts array added')
    is(tick.stack[0].alts[0], 'FindMe', 'original name in alts array')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe
    code-creation,Builtin,4,104700,0x1cd8396af4a0,371,AltName
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
})

test('code-creation does not add the name of a duplicate frame to an `alt` array if the name is the same', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'address mapped to function')
    is(Array.isArray(tick.stack[0].alts), false, 'no alts array')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe
    code-creation,Builtin,4,104700,0x1cd8396af4a0,371,FindMe
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
})

test('code-creation does not duplicate names in the `alt` array', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'AltName', 'address mapped to latest name')
    is(Array.isArray(tick.stack[0].alts), true, 'alts array added')
    is(tick.stack[0].alts[0], 'FindMe', 'original name in alts array')
    is(tick.stack[0].alts[1], 'AltName', 'additional name added to alts array')
    is(tick.stack[0].alts[2], undefined, 'no duplicates in alts array')
    is(tick.stack[0].alts[3], undefined, 'no duplicates in alts array')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe
    code-creation,Builtin,4,104700,0x1cd8396af4a0,371,AltName
    code-creation,Builtin,5,104700,0x1cd8396af4a0,371,FindMe
    code-creation,Builtin,6,104700,0x1cd8396af4a0,371,AltName
    code-creation,Builtin,5,104700,0x1cd8396af4a0,371,FindMe
    code-creation,Builtin,6,104700,0x1cd8396af4a0,371,AltName
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
}) 

test('code-move moves entry at one address to another address', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'MoveMe', 'address mapped to function')
    stream.once('data', (tick) => {
      is(tick.stack[0].name, '0x1cd8396af402', 'entry removed from prior address')
      stream.once('data', (tick) => {
        is(tick.stack[0].name, 'MoveMe', 'entry successfully moved to new address')
        end()
      })
      stream.write(dedent `
        tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
        \n
      `)
    })
    stream.write(dedent `
      code-move,0x1cd8396af400,0x1cd8396af4a0
      tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af402
      \n
    `)
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af400,10,MoveMe
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af402
    \n
  `)
})

test('code-move removes pre-existing entries in target address space', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'PreExistingRemoveMe', 'pre-existing entry found before code move')

    stream.once('data', (tick) => {
      is(tick.stack[0].name, 'ShouldBeMoved', 'resolves to correct entry, pre-existing entry removed')
      end()
    })
    stream.write(dedent `
      code-move,0x1cd8396af400,0x1cd8396af4a0
      tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
      \n
    `)
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a1,10,PreExistingRemoveMe
    code-creation,Builtin,3,104700,0x1cd8396af400,10,ShouldBeMoved
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
})

test('code-move does not remove pre-existing entries outside of target address space', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'PreExisting', 'pre-existing entry found before code move')

    stream.once('data', (tick) => {
      is(tick.stack[0].name, 'ShouldBeMoved', 'resolves to correct entry')

      stream.once('data', (tick) => {
        is(tick.stack[0].name, 'PreExisting', 'pre-existing entry remains')
        end()
      })
      stream.write(dedent `
        tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af492
        \n
      `)

    })
    stream.write(dedent `
      code-move,0x1cd8396af400,0x1cd8396af4a0
      tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
      \n
    `)
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af480,10,PreExisting
    code-creation,Builtin,3,104700,0x1cd8396af400,10,ShouldBeMoved
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
})

test('code-move from address not found', ({is, end}) => {
  const stream = proffer({
    warn: (str) => {
      is(str, `code-move address 0x1cd8396af4a0 not found`)
      end()
    }
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-move,0x1cd8396af4a0,0x1cd8396af4a1
    \n
  `)
})

test('sfi-move moves entry at one address to another address', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'MoveMe', 'address mapped to function')
    stream.once('data', (tick) => {
      is(tick.stack[0].name, '0x1cd8396af402', 'entry removed from prior address')
      stream.once('data', (tick) => {
        is(tick.stack[0].name, 'MoveMe', 'entry successfully moved to new address')
        end()
      })
      stream.write(dedent `
        tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
        \n
      `)
    })
    stream.write(dedent `
      sfi-move,0x1cd8396af400,0x1cd8396af4a0
      tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af402
      \n
    `)
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af400,10,MoveMe
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af402
    \n
  `)
})

test('sfi-move removes pre-existing entries in target address space', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'PreExistingRemoveMe', 'pre-existing entry found before code move')

    stream.once('data', (tick) => {
      is(tick.stack[0].name, 'ShouldBeMoved', 'resolves to correct entry, pre-existing entry removed')
      end()
    })
    stream.write(dedent `
      sfi-move,0x1cd8396af400,0x1cd8396af4a0
      tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
      \n
    `)
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a1,10,PreExistingRemoveMe
    code-creation,Builtin,3,104700,0x1cd8396af400,10,ShouldBeMoved
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
})

test('sfi-move from address not found', ({is, end}) => {
  const stream = proffer({
    warn: (str) => {
      is(str, `sfi-move address 0x1cd8396af4a0 not found`)
      end()
    }
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    sfi-move,0x1cd8396af4a0,0x1cd8396af4a1
    \n
  `)
})

test('code-delete removal', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'DeleteMe', 'address mapped to function')
    stream.once('data', (tick) => {
      is(tick.stack[0].name, 'RevealMe', 'code deletion succeeded')
      end()
    })
    stream.write(dedent `
      code-delete,0x1cd8396af4a1
      tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
      \n
    `)
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,RevealMe
    code-creation,Builtin,3,104700,0x1cd8396af4a1,371,DeleteMe
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a2
    \n
  `)
})

test('code-delete address not found', ({is, end}) => {
  const stream = proffer({
    warn: (str) => {
      is(str, 'code-delete address 0x1cd8396af4a1 not found', 'warning emitted')
      end()
    }
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-delete,0x1cd8396af4a1
    \n
  `)
})


if (process.platform !== 'win32') {
  test('shared-library maps addresses to static functions', ({is, end}) => {
    const { stdout } = spawnSync('nm', [process.argv[0]])
    const line = stdout.toString().split('\n')[0]
    const [ strAddr, ...rest ] = line.split(' ')
    const addr = parseInt(strAddr, 16).toString(16)
    const name = rest.join(' ').replace(/^T|t /, '')
    const stream = proffer()

    stream.once('data', (tick) => {
      is(tick.stack[0].name, name, 'address mapped to static function')
      end()
    })

    stream.write(dedent `
      v8-version,6,6,346,24,-node.5,0
      shared-library,${process.argv[0]},0x100001000,0x100c106aa,0
      profiler,begin,1
      tick,0x1007269a9,248316,0,0x3000000020,0,${addr}
      \n
    `)
  })

  test('shared-library adjusts static function addresses per start address when appropriate', ({is, end}) => {
    const { stdout } = spawnSync('nm', ['-n', process.argv[0]])
    const line = stdout.toString().split('\n').find((l) => !/T start/.test(l) && / T /i.test(l))
    const [ strAddr, ...rest ] = line.split(' ')
    const addrn = parseInt(strAddr, 16)
    const addr = '0x' + (addrn.toString(16))
    const name = rest.join(' ').replace(/^T|t /, '').trim()
    const slide = 100
    const stream = proffer()

    stream.once('data', (tick) => {
      is(tick.stack[0].name, name, 'address mapped to static function')
      is(tick.stack[0].start, '0x' + (addrn + 4295071964).toString(16), 'address mapped to static function')
      end()
    })

    stream.write(dedent `
      v8-version,6,6,346,24,-node.5,0
      shared-library,${process.argv[0]},0x${(addrn + 1e5).toString(16)},0x${(addrn + 9e9).toString(16)},0
      profiler,begin,1
      tick,0x1007269a9,248316,0,0x3000000020,0,${(addrn + 4295071965).toString(16)}
      \n
    `)
  })

  test('shared-library maps to library name when symbol is not found', ({is, end}) => {
    const stream = proffer()

    stream.once('data', (tick) => {
      is(tick.stack[0].name, '/library/which/will/not/resolve', 'address mapped to library')
      end()
    })

    // todo, figure out if the node address space (start,end)
    // should be determined as well
    stream.write(dedent `
      v8-version,6,6,346,24,-node.5,0
      shared-library,/library/which/will/not/resolve,0x100001000,0x100c106aa,0
      profiler,begin,1
      tick,0x1007269a9,248316,0,0x3000000020,0,0x100001000
      \n
    `)
  })

  test('shared-library ignores start symbol', ({is, end}) => {
    const { stdout } = spawnSync('nm', [process.argv[0]])
    const line = stdout.toString().split('\n').find((l) => / start$/.test(l))
    const [ strAddr, ...rest ] = line.split(' ')
    const addr = parseInt(strAddr, 16).toString(16)
    const name = rest.join(' ').replace(/^T|t /, '')
    const stream = proffer()


    stream.once('data', (tick) => {
      is(tick.stack[0].name, process.argv[0], 'start symbol ignored')
      end()
    })

    // todo, figure out if the node address space (start,end)
    // should be determined as well
    stream.write(dedent `
      v8-version,6,6,346,24,-node.5,0
      shared-library,${process.argv[0]},0x100001000,0x100c106aa,0
      profiler,begin,1
      tick,0x1007269a9,248316,0,0x3000000020,0,${addr}
      \n
    `)
  })

  test('shared-library also handles V8 6.2 logs', ({is, end}) => {
    const { stdout } = spawnSync('nm', [process.argv[0]])
    const line = stdout.toString().split('\n')[0]
    const [ strAddr, ...rest ] = line.split(' ')
    const addr = parseInt(strAddr, 16).toString(16)
    const name = rest.join(' ').replace(/^T|t /, '')
    const stream = proffer()


    stream.once('data', (tick) => {
      is(tick.stack[0].name, '/library/which/will/not/resolve', 'address mapped to library')
      end()
    })

    // todo, figure out if the node address space (start,end)
    // should be determined as well
    stream.write(dedent `
      v8-version,6,2,414,50,0
      shared-library,"/library/which/will/not/resolve",0x100001000,0x100c106aa,0
      profiler,begin,1
      tick,0x1007269a9,248316,0,0x3000000020,0,0x100001000
      \n
    `)
  })

} else {
  // TODO Windows equivalent
  test('shared-library maps addresses to static functions')
  test('shared-library maps to library name when symbol is not found')
}

test('tick only JS VM stacks are processed', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, 'FindMe', 'non JS VM stacks ignored')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x1cd8396af430,371,IgnoreMe
    code-creation,Builtin,3,104700,0x1cd8396af440,371,IgnoreMe
    code-creation,Builtin,3,104700,0x1cd8396af450,371,IgnoreMe
    code-creation,Builtin,3,104700,0x1cd8396af460,371,IgnoreMe
    code-creation,Builtin,3,104700,0x1cd8396af470,371,IgnoreMe
    code-creation,Builtin,3,104700,0x1cd8396af480,371,IgnoreMe
    code-creation,Builtin,3,104700,0x1cd8396af490,371,IgnoreMe
    code-creation,Builtin,3,104700,0x1cd8396af4a0,371,FindMe
    tick,0x1007269a9,248316,1,0x3000000020,1,0x1cd8396af431
    tick,0x1007269a9,248316,1,0x3000000020,2,0x1cd8396af441
    tick,0x1007269a9,248316,1,0x3000000020,3,0x1cd8396af451
    tick,0x1007269a9,248316,1,0x3000000020,4,0x1cd8396af461
    tick,0x1007269a9,248316,1,0x3000000020,5,0x1cd8396af471
    tick,0x1007269a9,248316,1,0x3000000020,6,0x1cd8396af481
    tick,0x1007269a9,248316,1,0x3000000020,7,0x1cd8396af491
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('tick resolves name to address if dynamic function not found', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, '0x1cd8396af4a1', 'name is address')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('tick resolves name to address if static function not found', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, '0x1cd8396af4a1', 'name is address')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('tick resolves name to address if static function not found', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, '0x1cd8396af4a1', 'name is address')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('tick adds the pc field to the stack', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, '0x1cd8396af4a1', 'first address in stack')
    is(tick.stack[1].name, '0x1007269a9', 'pc at top of stack')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    tick,0x1007269a9,248316,0,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('tick adds external cb address to top of stack (when present) instead of pc', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, '0x1cd8396af4a1', 'first address in stack')
    is(tick.stack[1].name, '0x3000000020', 'external cb at top of stack')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    tick,0x1007269a9,248316,1,0x3000000020,0,0x1cd8396af4a1
    \n
  `)
})

test('tick adds top of stack address to stack (above pc) when top of stack address references a JS function', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, '0x3000000010', 'first address in stack')
    is(tick.stack[1].name, '0x1007269a9', 'pc just under top of stack')
    is(tick.stack[2].name, 'Topper', 'top of stack resolved function at top of stack')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,LazyCompile,3,104700,0x3000000020,371,Topper,0x3000000030,*
    tick,0x1007269a9,248316,0,0x3000000020,0,0x3000000010
    \n
  `)
})

test('tick does not add top of stack address to stack when top of stack address does not reference a JS function', ({is, end}) => {
  const stream = proffer()

  stream.once('data', (tick) => {
    is(tick.stack[0].name, '0x3000000010', 'first address in stack')
    is(tick.stack[1].name, '0x1007269a9', 'pc just under top of stack')
    is(tick.stack[2], undefined, 'top of stack address not added to stack')
    end()
  })

  stream.write(dedent `
    v8-version,6,6,346,24,-node.5,0
    profiler,begin,1
    code-creation,Builtin,3,104700,0x3000000020,371,SomeCodeFunc
    tick,0x1007269a9,248316,0,0x3000000020,0,0x3000000010
    \n
  `)
})

