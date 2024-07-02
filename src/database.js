import { createConnection } from "mysql2"

export const connection = createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456789',
    database: 'evenement'
})

connection.connect((err) => {
    if(err){
        console.error('Erreur de connexion à la base de donnée:' + err);
        throw err;
    }
    console.log('Connecté à la base de donnée MySQL')
})

export default connection;
