# parcoords-es

ES6 module of Syntagmatic's [Parallel Coordinates](https://github.com/syntagmatic/parallel-coordinates) (aka. parcoords). This library is completely based on D3 V4 API. 

## Features

Please refer to [Parallel Coordinates](https://github.com/syntagmatic/parallel-coordinates)'s project page for concepts and API usage

All examples of the original project has been verified. You can play with them via running:
 
```
npm install
npm run dev
```

Limitation: parcoords-es doesn't have multi-brush mode. (all other brush modes work properly)

## Usage

### ES6
1. Install library in your project
```
npm install parcoords-es --save
```

2. import module

```
import 'parcoords-es/parcoords.css';
impoart ParCoords from 'parcoords-es';

const _chart = ParCoords()....
```
### Standalone

parcoords.standalone.js contains all dependencies and can be used directly in your html page. Please note that only essential D3 V4 modules are bundled, your global namespace won't be polluted.
```
<link rel="stylesheet" type="text/css" href="./parcoords.css">
<script src="./parcoords.standalone.js"></script>

var parcoords = ParCoords()("#example")
```

You are free to use either D3 V3 or D3 V4 in your html. demo/superformula.html demonstrates how to use parcoords-es with d3 v3 libraries.

## Development

Follow this instruction to setup development environment for parcoords-es
### Prerequisites

npm


### Installing


```
npm install
```

### Building

```
npm run build
```
### Development
Internal server will be launched, hosting all demos at localhost:3004

```
npm run dev
```

### Testing (Coverage)
run all unit tests and generate test coverage report.

```
npm run test:cover
```


## Built With

* [D3 V4](http://www.dropwizard.io/1.0.2/docs/) - D3 modules are used
* [Rollup](https://github.com/rollup/rollup) - Module bundler

## Authors

* **Xing Yun** - *ES6 modular approach and D3 V4 upgrade* 

See also the list of [contributors](https://github.com/syntagmatic/parallel-coordinates/graphs/contributors) who created the ParallelCoordinates.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

This project is based on [Parallel Coordinates](https://github.com/syntagmatic/parallel-coordinates) v0.7.0. Many thanks to parcoords contributors for such a complicated and useful D3 visualization.

