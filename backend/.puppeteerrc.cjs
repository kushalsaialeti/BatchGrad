const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer to be in the project directory
    // so that Render will persist it correctly between build and deploy phases!
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
