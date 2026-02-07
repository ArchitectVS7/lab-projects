const path = require('path');

module.exports = {
    'backend/**/*.ts': (filenames) => {
        const cwd = process.cwd();
        const relativeFiles = filenames
            .map((file) => path.relative(path.join(cwd, 'backend'), file))
            .join(' ');
        return `npm run lint:fix --prefix backend -- ${relativeFiles}`;
    },
    'frontend/**/*.{ts,tsx}': (filenames) => {
        const cwd = process.cwd();
        const relativeFiles = filenames
            .map((file) => path.relative(path.join(cwd, 'frontend'), file))
            .join(' ');
        return `npm run lint:fix --prefix frontend -- ${relativeFiles}`;
    },
};
