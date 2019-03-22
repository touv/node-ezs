# Make pipeline of streams easy : Easy Streams

[![Build Status](https://travis-ci.org/touv/node-ezs.png?branch=master)](https://travis-ci.org/touv/node-ezs)
[![npm version](https://img.shields.io/npm/v/ezs.svg)](https://npm.im/ezs)
[![license](https://img.shields.io/npm/l/ezs.svg)](https://npm.im/ezs)
[![Coverage Status](https://coveralls.io/repos/github/touv/node-ezs/badge.svg?branch=latest)](https://coveralls.io/github/touv/node-ezs?branch=latest)

It's just a wrapper to build Stream transformers with functional style. It's like the koa / expressjs middlewares !

# Example

```javascript
const ezs = require('ezs')

ezs.use(require('ezs-basics'));

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin
  .pipe(ezs('split', { delimiter: "\n" }))
  .pipe(ezs('counter'))
  .pipe(ezs((input, output) => output.send(input.toString()));
  .pipe(process.stdout);
```

# Installation

With [npm](http://npmjs.org):

    $ npm install ezs

# Tests

Use [mocha](https://github.com/visionmedia/mocha) to run the tests.

    $ npm install mocha
    $ mocha test

# Concepts

### Scope

Each statement function have its own scope and can access to few methods :

-   this.isLast()
-   this.isFirst()
-   this.getIndex()
-   this.getParam(name, defaultValue)

### Output Object

Output object is an object with few methods :

-   output.write(something)
-   output.end()
-   output.send(something)
-   output.close()
-   output.stop(withAnError)

With a sync statement, you can break the pipe  with throw but with an async statement, you should use `stop(with An Error)` instead of throw.

### statement modes

Each statement can be executed in different modes :

-   **normal** : the statement is executed on each object its received
-   **unique** : the statement is executed only on the first object its received, for all other objects, the same result as the first object is return
-   **detachable** : the statement is executed on each object its received, but if ezs use a cluster or a server, the statement is executed on the server/cluster

The basic way to use modes, it's with a ezs script or with ezs.dispatch function.

# CLI

The command line interface is used to create run pipelines described in .ini files.

It is also possible to launch a web server allowing remote execution of .ini files

    $ ezs -h                                                                                                                                                                   ven. 15 mars 2019 16:15:20 CET
    Usage: ezs [options] [<file>|<directory>] [<file2> <file3> ...]

    Options:
      --help         Affiche de l'aide                                     [booléen]
      --version      Affiche le numéro de version                          [booléen]
      --verbose, -v  Enable debug mode with DEBUG=ezs      [booléen] [défaut: false]
      --daemon, -d   Launch daemon on a directory containing commands script
                                                               [chaine de caractère]
      --server, -s   Server to dispach commands                [chaine de caractère]
      --env, -e      Execute commands with environement variables as input
                                                           [booléen] [défaut: false]

    for more information, find our manual at https://github.com/touv/node-ezs

# API Documentation

## ezs(statement : Mixed, [params : Object]) : Stream

Converts a transform stream with existing function or adhoc function.

```javascript
	const ezs = require('ezs'),
	let transformer = ezs(function(input, output) {
		output.send(input.toString())
	})
```

## ezs.use(module: Function) : None

Adding bundle of statements. see the avaible modules here : <https://www.npmjs.com/browse/keyword/ezs>

```javascript
	import ezs from 'ezs';
	import basics from 'ezs-basics';
	import files from 'ezs-files';

	ezs.use(basics);
	ezs.use(files);
```

## ezs.config = (name : String, options : Object)

To set globaly a statement parameter.

## ezs.pipeline = (commands, options : Object)

Launch a serie of statements.

## ezs.booster = (commands, options : Object)

Launch a serie of statements (with cache).

## ezs.catch(func : Function)

catch Error in NodeJS pipeline

## ezs.toBuffer(options : Object)

get chunk of in NodeJS pipeline and send Buffer of the chunk

## to generate commands pipeline

### ezs.metaString = (commands: String, options : Object)

Parse an .ini string to extract global keys and values.

### ezs.metaFile = (filename : String, options : Object)

Parse an .ini file to extract global keys and values.

### ezs.parseString = (commands : String)

Parse an .ini string and return Object contains a serie of statements

### ezs.fromString = (commands, options : Object)

Parse an .ini string and launch a serie of statements

### ezs.parseFile = (filename : String)

Parse an .ini file and return Object contains a serie of statements

### ezs.fromFile(filename : String, options : Object)

Parse an .ini file and launch a serie of statements

# Statements

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [assign](#assign)
    -   [Parameters](#parameters)
-   [concat](#concat)
    -   [Parameters](#parameters-1)
-   [debug](#debug)
    -   [Parameters](#parameters-2)
-   [delegate](#delegate)
    -   [Parameters](#parameters-3)
-   [dispatch](#dispatch)
    -   [Parameters](#parameters-4)
-   [dump](#dump)
    -   [Parameters](#parameters-5)
-   [env](#env)
    -   [Parameters](#parameters-6)
-   [extract](#extract)
    -   [Parameters](#parameters-7)
-   [group](#group)
    -   [Parameters](#parameters-8)
-   [keep](#keep)
    -   [Parameters](#parameters-9)
-   [eol](#eol)
-   [eol](#eol-1)
-   [replace](#replace)
    -   [Parameters](#parameters-10)
-   [shift](#shift)
    -   [Parameters](#parameters-11)
-   [shuffle](#shuffle)
    -   [Parameters](#parameters-12)
-   [tracer](#tracer)
    -   [Parameters](#parameters-13)
-   [transit](#transit)
    -   [Parameters](#parameters-14)
-   [ungroup](#ungroup)
    -   [Parameters](#parameters-15)

## assign

Take `Object` and add new field

### Parameters

-   `data`  
-   `feed`  
-   `path` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** path of the new field
-   `value` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** value of the new field

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## concat

Take all `String`, concat them and thow just one

### Parameters

-   `data`  
-   `feed`  
-   `beginWith` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** Add value at the begin
-   `joinWith` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** use value to join 2 chunk
-   `endWith` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** Add value at the end

Returns **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

## debug

Take `Object` , print it and throw the same object

### Parameters

-   `data`  
-   `feed`  
-   `level` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** console level : log or error (optional, default `log`)
-   `text` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** text before the dump (optional, default `valueOf`)
-   `path` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** path of field to print

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## delegate

Takes an `Object` delegate processing to an external pipeline

### Parameters

-   `data`  
-   `feed`  
-   `file` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** the external pipeline is descrbied in a file
-   `script` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** the external pipeline is descrbied in a sting of characters
-   `commands` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** the external pipeline is descrbied in object

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## dispatch

Takes an `Object` dispatch processing to an external pipeline in one or more servers

### Parameters

-   `data`  
-   `feed`  
-   `server` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** servers to dispatch data
-   `file` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** the external pipeline is descrbied in a file
-   `script` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** the external pipeline is descrbied in a sting of characters
-   `commands` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** the external pipeline is descrbied in object

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## dump

Take all `Object` and genereta a json array

### Parameters

-   `data`  
-   `feed`  
-   `indent` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** indent JSON (optional, default `false`)

Returns **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

## env

Take `Object` and send the same object
but in the meantime, it is possible to add
new environment field

### Parameters

-   `data`  
-   `feed`  
-   `path` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** path of the new field
-   `value` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** value of the new field

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## extract

Take `Object` and throw each value of fields

### Parameters

-   `data`  
-   `feed`  
-   `path` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** path of field to extract

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## group

Take all `chunk`, and throw array of chunks

### Parameters

-   `data`  
-   `feed`  
-   `size` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** Size of each partition

Returns **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

## keep

Take `Object` and throw the same object but keep only
spefici fields

### Parameters

-   `data`  
-   `feed`  
-   `path` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** path of field to keep

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## eol

Take all `Object`, throw encoded `String`

Type: [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)

Returns **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

## eol

Take `String` and throw `Object` builded by JSON.parse on each line

Type: [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)

Returns **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

## replace

Take `Object` and create a new object with some fields

### Parameters

-   `data`  
-   `feed`  
-   `path` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** path of the new field
-   `value` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** value of the new field

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## shift

Take the first `Object` and close the feed

### Parameters

-   `data`  
-   `feed`  

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## shuffle

Take `Object`, shuffle data of the whole object or only some fields specified by path

### Parameters

-   `data`  
-   `feed`  
-   `path` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** path of field to shuffle

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## tracer

Take `Object`, print a character and throw the same object

### Parameters

-   `data`  
-   `feed`  
-   `print` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** character to print at each object (optional, default `.`)
-   `last` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** character to print at last call (optional, default `.`)
-   `first` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** character to print at first call (optional, default `.`)

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## transit

Take `Object` and throw the same object

### Parameters

-   `data`  
-   `feed`  

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## ungroup

Take all `chunk`, and throw each item of chunks

### Parameters

-   `data`  
-   `feed`  

Returns **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

# Related projects

-   <https://github.com/rvagg/through2>
-   <https://github.com/dominictarr/event-stream>
-   <https://github.com/ZJONSSON/streamz>
-   <https://github.com/ZJONSSON/etl>
-   <https://github.com/chbrown/streaming>

# License

[MIT/X11](https://github.com/touv/node-ezs/blob/master/LICENSE)
