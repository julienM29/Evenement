import { createConnection } from "mysql2"
// Importation de mysql2 pour la connection avec ma BDD MySQL

// Constante de connection à la base de donnée qui sera utilisée partout 
export const connection = createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456789',
    database: 'evenement'
})
// Test de la connection
connection.connect((err) => {
    if(err){
        console.error('Erreur de connexion à la base de donnée:' + err);
        throw err;
    }
    console.log('Connecté à la base de donnée MySQL')
})

export default connection;
