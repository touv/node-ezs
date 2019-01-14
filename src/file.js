import { readFileSync, statSync } from 'fs';
import { dirname } from 'path';

export default function File(ezs, filename) {
    try {
        if (!statSync(filename).isFile()) {
            return null;
        }
        ezs.addPath(dirname(filename));
        return readFileSync(filename, 'utf8');
    } catch (e) {
        throw e;
    }
}
