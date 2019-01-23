import _ from 'lodash';
import { PassThrough } from 'stream';
import http from 'http';
import Parameter from './parameter';
import { DEBUG, PORT, NSHARDS } from './constants';

export const parseAddress = (srvr) => {
    if (typeof srvr !== 'string') {
        return null;
    }
    const hostWithPort = srvr.match(/^\[?([^\]]+)\]?:(\d+)$/);
    if (hostWithPort) {
        return {
            hostname: hostWithPort[1],
            port: Number(hostWithPort[2]),
        };
    }
    return {
        hostname: srvr,
        port: Number(PORT),
    };
};

export const agent = new http.Agent({
    maxSockets: 0,
    keepAlive: false,
    timeout: 0,
});

export const inspectServers = (servers, ns = NSHARDS) => _
    .chain(Array.isArray(servers) ? servers : [servers])
    .compact()
    .uniq()
    .map(parseAddress)
    .map(s => Array(ns).fill(s)) // multiple each line
    .value()
    .reduce((a, b) => a.concat(b), []); // flatten all

export const registerCommands = (ezs, { hostname, port }, commands, environment = {}) => new Promise(
    (resolve, reject) => {
        if (!Array.isArray(commands) || commands.length === 0) {
            return reject(new Error('No valid commands array'));
        }
        DEBUG(`Client will register commands to SRV//${hostname}:${port} `);
        const serverOptions = {
            hostname,
            port,
            path: '/',
            method: 'POST',
            headers: {
                'Transfer-Encoding': 'chunked',
                'Content-Type': ' application/json',
            },
            agent,
        };
        commands.forEach((command, index) => {
            serverOptions.headers[`X-Command-${index}`] = Parameter.encode(JSON.stringify(command));
        });
        Object.keys(environment).forEach((keyEnv) => {
            serverOptions.headers[`X-Environment-${keyEnv}`] = Parameter.encode(JSON.stringify(environment[keyEnv]));
        });
        return resolve(serverOptions);
    },
);

export const connectServer = ezs => (serverOptions, index) => {
    const opts = {
        ...serverOptions,
        timeout: 0,
    };
    const { hostname, port } = opts;
    const input = new PassThrough(ezs.objectMode());
    const output = new PassThrough(ezs.objectMode());
    DEBUG(`Client will send data to SRV//${hostname}:${port} `);
    const handle = http.request(opts, (res) => {
        DEBUG(`Client receive ${res.statusCode}`);
        if (res.statusCode === 200) {
            res
                .pipe(ezs.uncompress())
                .pipe(ezs('unpack'))
                .pipe(ezs('ungroup'))
                .on('data', chunk => output.write(chunk))
                .on('end', () => output.end());
            return 1;
        }
        if (res.statusCode === 400) {
            DEBUG(`Unable to execute STMP#${opts.path.slice(1)} with SRV//${hostname}:${port}#${index}`);
            const errmsg = Parameter.decode(res.headers['x-error']);
            output.write(new Error(`Server sent:\n ${errmsg}`));
            output.end();
            return 2;
        }
        output.write(new Error(
            `SRV//${hostname}:${port}#${index} return ${res.statusCode}`,
        ));
        return 3;
    });

    handle.on('error', (e) => {
        output.write(new Error(
            `SRV//${hostname || '?'}:${port || '?'}#${index} return ${e.message}`,
        ));
        output.end();
        handle.abort();
    });

    handle.setNoDelay(false);

    input
        .pipe(ezs('pack'))
        .pipe(ezs.compress())
        .pipe(handle);
    const duplex = [input, output, index];
    return duplex;
};

export const sendServer = (handle, data) => {
    handle[0].write(data);
    handle[0].end();
    return handle[1];
};
