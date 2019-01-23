import pMap from 'p-map';
import File from '../file';
import Commands from '../commands';
import Workers from '../workers';
import { DEBUG } from '../constants';
import {
    registerCommands,
    inspectServers,
    connectServer,
    sendServer,
} from '../protocol';

export default function swarm(data, feed) {
    const { ezs } = this;
    if (this.isLast()) {
        return feed.close();
    }
    if (this.isFirst()) {
        const servers = inspectServers(this.getParam('server', []));
        const file = this.getParam('file');
        const script = this.getParam('script', File(ezs, file));
        const cmds = new Commands(ezs.parseString(script));
        const commands = this.getParam('commands', cmds.get());

        if (!servers || servers.length === 0 || !commands || commands.length === 0) {
            return feed.stop(new Error('Invalid parmeter for swarm'));
        }
        pMap(servers, server => registerCommands(ezs, server, commands, this.getEnv()).catch((e) => {
            DEBUG(`Unable to register commands with the server: ${server}`, e);
        })).then((workers) => {
            this.servers = new Workers(workers);
            const worker = this.servers.choose();
            const request = connectServer(ezs);
            const handle = request(worker, this.getIndex());
            return sendServer(handle, data)
                .pipe(ezs.catch())
                .on('error', e => feed.write(e))
                .on('data', d => feed.write(d))
                .on('end', () => feed.end());
        }).catch((e) => {
            DEBUG('Unable to connect to workers', e);
            feed.stop(e);
        });
        return null;
    }
    const server = this.servers.choose();
    const request = connectServer(ezs);
    const handle = request(server, this.getIndex());
    return sendServer(handle, data)
        .pipe(ezs.catch())
        .on('error', e => feed.write(e))
        .on('data', d => feed.write(d))
        .on('end', () => feed.end());
}
