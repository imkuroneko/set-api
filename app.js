const fs = require('fs');
const path = require('path');

try {
    const cronsFiles = fs.readdirSync(path.resolve('./crons')).filter(file => file.endsWith('.js'));
    for(file of cronsFiles) {
        const cron = require(path.resolve(`./crons/${file}`))();
        cron.start();
    }
} catch(error) {
    console.error('[load:crons] ', error.message);
}

// TODO :: create web api