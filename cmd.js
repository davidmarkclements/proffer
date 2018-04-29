#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')
const pump = require('pump')
const { serialize } = require('ndjson')
const input = process.argv[2] ? fs.createReadStream(path.join(process.cwd(), process.argv[2])) : process.stdin

pump(input, require('.')(), serialize(), process.stdout)
