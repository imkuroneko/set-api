const cron = require('cron');
const axios = require('axios');
const SQLite = require('better-sqlite3');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const script = () => new cron.CronJob(
    '48 00 * * *',
    async function() {
        try {
            for (let i = 0; i <= 9; i++) {
                const fileUrl = `https://www.set.gov.py/rest/contents/download/collaboration/sites/PARAGUAY-SET/documents/informes-periodicos/ruc/ruc${i}.zip`;
                await axios({ url: fileUrl, method: 'GET', responseType: 'arraybuffer' }).then(async (response) => {

                    // Guardar el archivo descargado en /temp
                    await fs.writeFileSync(path.resolve(`./temp/ruc${i}.zip`), response.data);

                    // Descomprimir el archivo y guardar todo en la carpeta /temp
                    const zip = new AdmZip(path.resolve(`./temp/ruc${i}.zip`));
                    zip.extractAllTo(path.resolve(`./temp`));

                    // Eliminar el archivo zip descargado (ya no nos sirve)
                    fs.unlinkSync(path.resolve(`./temp/ruc${i}.zip`));

                    // Abrir el archivo de base de datos
                    const sql = new SQLite(path.resolve('./data/ruc.sqlite'));

                    // Leer el archivo txt
                    const fileContent = fs.readFileSync(path.resolve(`./temp/ruc${i}.txt`), 'utf-8');
                    const lines = fileContent.split('\n');

                    // Tratar el contenido de cada archivo txt
                    lines.forEach(async (line) => {
                        const [ ruc_actual, razon_social, dv, ruc_anterior, estado ] = line.split('|');

                        try {
                            const sqlQuery = ` INSERT INTO
                                contribuyentes ( ruc_actual, ruc_anterior, digito_verificador, razon_social, estado )
                                VALUES ( @rn, @rv, @dv, @rs, @es )
                                ON CONFLICT(ruc_actual) DO UPDATE SET estado = @es ;
                            `;
                            const query = sql.prepare(sqlQuery);
                            query.run({ rn: ruc_actual, rv: ruc_anterior, dv: dv, rs: razon_social, es: estado });
                        } catch(error) {
                            console.error('cronjob:set_update_info:sqlite', error.message);
                        }
                    });

                    // Eliminar el archivo txt (ya no nos sirve)
                    fs.unlinkSync(path.resolve(`./temp/ruc${i}.txt`));
                });
            }
        } catch(error) {
            console.error('cronjob:set_update_info', error);
        };
    }, null, false);

// Module export ===========================================================================================================
module.exports = script;
