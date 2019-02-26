import { realpathSync } from 'fs';
import { PassThrough } from 'stream';
import yargs from 'yargs';
import debug from 'debug';
import { DEBUG } from './constants';
import ezs from '.';
import Commands from './commands';
import File from './file';
import { version } from '../package.json';
import settings from './settings';

export default function cli(errlog) {
    const args = yargs
        .env('EZS')
        .usage('Usage: $0 [options] [<file>]')
        .version(version)
        .options({
            verbose: {
                alias: 'v',
                default: false,
                describe: 'Enable debug mode with DEBUG=ezs',
                type: 'boolean',
            },
            daemon: {
                alias: 'd',
                describe: 'Launch daemon on path',
                type: 'string',
            },
            server: {
                alias: 's',
                describe: 'Server to dispach commands',
                type: 'string',
            },
            env: {
                alias: 'e',
                default: false,
                describe: 'Execute commands with environement variables as input',
                type: 'boolean',
            },
        })
        .epilogue('for more information, find our manual at https://github.com/touv/node-ezs');

    const { argv } = args;
    const firstarg = argv._.shift();
    const { port } = argv;

    if (argv.verbose) {
        debug.enable('ezs');
    }
    if (argv.daemon) {
        try {
            settings.servePath = realpathSync(argv.daemon);
        } catch (e) {
            errlog(`Error: ${argv.daemon} doesn't exists.`);
            process.exit(1);
        }
        DEBUG(`Serving ${settings.servePath} with ${settings.nShards} shards`);
        return ezs.createCluster(port);
    }

    if (!firstarg) {
        yargs.showHelp();
        return process.exit(1);
    }

    const script = File(ezs, firstarg);
    if (!script) {
        errlog(`Error: ${firstarg} isn't a file.`);
        process.exit(1);
    }
    const cmds = new Commands(ezs.parseString(script));

    let varenvs;
    let input;
    if (argv.env) {
        DEBUG('Reading varenvs variables...');
        varenvs = {};
        input = new PassThrough(ezs.objectMode());
        input.write(process.env);
        input.end();
    } else {
        DEBUG('Reading standard input...');
        varenvs = { ...process.env };
        input = process.stdin;
        input.resume();
        input.setEncoding('utf8');
    }
    const server = Array.isArray(argv.server) ? argv.server : [argv.server];
    const environement = { ...varenvs, server };
    let stream1;
    if (argv.server) {
        DEBUG('Connecting to server...');
        const runplan = cmds.analyse();
        const usecmds = cmds.getUseCommands();
        const stream0 = usecmds.reduce(ezs.command, input);
        stream1 = runplan.reduce((stream, section) => {
            if (section.func === 'pipeline') {
                return stream
                    .pipe(ezs.pipeline(section.cmds, environement))
                    .pipe(ezs.catch((e) => {
                        errlog(e.message.split('\n').shift());
                        process.exit(2);
                    }));
            }
            return stream
                .pipe(ezs('dispatch', {
                    commands: section.cmds,
                    server,
                    environement,
                }))
                .pipe(ezs.catch((e) => {
                    errlog(e.message.split('\n').shift());
                    process.exit(2);
                }));
        }, stream0);
    } else {
        stream1 = input
            .pipe(ezs.pipeline(cmds.get(), environement))
            .pipe(ezs.catch((e) => {
                errlog(e.message.split('\n').shift());
                process.exit(2);
            }));
    }
    const stream2 = stream1.pipe(ezs.toBuffer());
    stream2.on('end', () => {
        process.exit(0);
    });
    stream2.pipe(process.stdout);
    return argv;
}
