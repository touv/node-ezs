import pMap from 'p-map';
import MultiStream from 'multistream';
import File from '../file';
import Commands from '../commands';
import { DEBUG } from '../constants';
import {
    registerCommands,
    inspectServers,
    connectServer,
    writeTo,
} from '../protocol';

export default function dispatch(data, feed) {
    const { ezs } = this;
    const writeHandle = (dta, cb) => {
        if (this.lastIndex >= this.handles.length) {
            this.lastIndex = 0;
        }
        DEBUG(`Write ${dta.length} items into handle #${this.lastIndex}/${this.handles.length}`);
        const check = writeTo(this.handles[this.lastIndex][0], dta, () => true);
        if (!check) {
            this.lastIndex += 1;
        }
        cb();
    };
    if (this.isFirst()) {
        this.lastIndex = 0;
        const servers = inspectServers(this.getParam('server', []));
        const file = this.getParam('file');
        const script = this.getParam('script', File(ezs, file));
        const cmds = new Commands(ezs.parseString(script));
        const commands = this.getParam('commands', cmds.get());

        if (!servers || servers.length === 0 || !commands || commands.length === 0) {
            return feed.stop(new Error('Invalid parmeter for dispatch'));
        }
        this.whenReady = pMap(servers, server => registerCommands(ezs, server, commands, this.getEnv())
            .catch((e) => {
                DEBUG(`Unable to register commands with the server: ${server}`, e);
            }))
            .then((workers) => {
                this.handles = workers.map(connectServer(ezs));
                const streams = this.handles.map(h => h[1]);
                const stream = MultiStream(streams, ezs.objectMode())
                    .on('error', e => feed.write(e))
                    .on('data', d => feed.write(d));
                this.whenFinish = new Promise((resolve) => {
                    stream.on('close', resolve);
                });
                return Promise.resolve(true);
            }).catch((e) => {
                DEBUG('Unable to connect to workers', e);
                feed.stop(e);
            });
    }
    if (this.isLast()) {
        this.whenReady
            .then(() => {
                const closeAll = () => {
                    this.whenFinish
                        .then(() => feed.close())
                        .catch((e) => {
                            DEBUG('Unable to close the dispatcher', e);
                            feed.stop(e);
                        });
                    this.handles.forEach(handle => handle[0].end());
                };
                return closeAll();
            })
            .catch((e) => {
                DEBUG('Unable to open the dispatcher', e);
                feed.stop(e);
            });
    } else {
        this.whenReady
            .then(() => {
                writeHandle(data, () => feed.end());
            })
            .catch((e) => {
                DEBUG('Unable to open the dispatcher', e);
                feed.stop(e);
            });
    }
    return 1;
}
