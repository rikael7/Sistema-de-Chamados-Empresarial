require("dotenv").config();

const { Pool } = require("./");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testar() {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log("Conectado!");
        console.log(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

testar();