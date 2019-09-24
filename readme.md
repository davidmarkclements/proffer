# proffer

Realtime V8 Tick Processor

## Usage

Profile a program:

```
node --prof app.js
```

This will create a file with filename starting `isolate-`.

Process it with proffer:

```sh
cat isolate-0x103801000-v8.log | proffer
```

This will output a stream of newline delimited JSON where hex addresses 
have been mapped to function names, paths and locations along with 
other useful meta data.


## Supported Node Versions

* Node 8.x.x
* Node 10.x.x
* Node 12.x.x

## Test

```sh
npm test
```

## Acknowledgements

Sponsored by [NearForm](https://www.nearform.com)

## License

MIT

