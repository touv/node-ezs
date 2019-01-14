import { readFileSync, statSync } from 'fs';
import { dirname } from 'path';

export default function File(ezs, filename) {
    try {
        if (!filename) {
            return false;
        }

        if (!statSync(filename).isFile()) {
            return false;
        }
        ezs.addPath(dirname(filename));
        return readFileSync(filename, 'utf8');
    } catch (e) {
        return false;
    }
}
