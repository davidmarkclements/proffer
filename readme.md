# proffer

Realtime V8 Tick Processor

## Test

```sh
npm test
```

#### Coverage

```
--------------------|----------|----------|----------|----------|-------------------|
File                |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
--------------------|----------|----------|----------|----------|-------------------|
All files           |       99 |    97.22 |      100 |    98.98 |                   |
 proffer            |      100 |      100 |      100 |      100 |                   |
  index.js          |      100 |      100 |      100 |      100 |                   |
 proffer/lib        |    95.92 |    88.89 |      100 |    95.92 |                   |
  constants.js      |      100 |      100 |      100 |      100 |                   |
  load-symbols.js   |    94.87 |    88.89 |      100 |    94.87 |             52,53 |
 proffer/lib/events |      100 |      100 |      100 |      100 |                   |
  code-creation.js  |      100 |      100 |      100 |      100 |                   |
  code-delete.js    |      100 |      100 |      100 |      100 |                   |
  code-move.js      |      100 |      100 |      100 |      100 |                   |
  shared-library.js |      100 |      100 |      100 |      100 |                   |
  tick.js           |      100 |      100 |      100 |      100 |                   |
--------------------|----------|----------|----------|----------|-------------------|
```

## License

MIT
