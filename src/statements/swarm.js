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
    if (this.isLast()) {
        return feed.close();
    }
    if (this.isFirst()) {
        const servers = inspectServers(this.getParam('server', []));
        const script = this.getParam('script');
        const string = this.getParam('string', File(this.ezs, script));
        const cmds = new Commands(this.ezs.parseString(string));
        const commands = this.getParam('commands', cmds.get());

        if (!servers || servers.length === 0 || !commands || commands.length === 0) {
            return feed.stop(new Error('Invalid parmeter for swarm'));
        }
        pMap(servers, server => registerCommands(this.ezs, server, commands).catch((e) => {
            DEBUG(`Unable to register commands with the server: ${server}`, e);
        })).then((workers) => {
            this.servers = new Workers(workers);
            const worker = this.servers.choose();
            const request = connectServer(this.ezs, this.getEnv(), e => feed.stop(e));
            const handle = request(worker, this.getIndex());
            return sendServer(handle, data)
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
    const request = connectServer(this.ezs, this.getEnv(), e => feed.stop(e));
    const handle = request(server, this.getIndex());
    return sendServer(handle, data)
        .on('error', e => feed.write(e))
        .on('data', d => feed.write(d))
        .on('end', () => feed.end());
}
