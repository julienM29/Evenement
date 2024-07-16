
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import ejs from 'ejs'
import { readFileSync } from "node:fs";

import fastify from "fastify";
import fastifyView from "@fastify/view"
import fastifyStatic from "@fastify/static"
import formbody from '@fastify/formbody';
import fastifySecureSession from "@fastify/secure-session";
import fastifyMultipart from '@fastify/multipart';

import { listeEvent, showEvent, createEvent, createKeyWords, modifierEvenement, getTest, participyEvent, showMyEventActive, unsubscribeEvent, cancelEvent, activateEvent, showMyEventPasted, deleteEvent, makeEvaluation } from "./actions/evenement.js";
import { createAccount, loginAction, logoutAction } from "./actions/auth.js";
import { modifyProfil, showProfil } from "./actions/profil.js";
import { showParticipations } from "./actions/participation.js";
import connection from "./database.js";
import { showDiscussion, showMessagerie } from "./discussion.js";


const app = fastify() // Création d'une instance fastify
const rootDir = dirname(dirname(fileURLToPath(import.meta.url))) // Route du projet dans les fichiers de l'ordinateur

// Paramètre de la vue utilisé par fastify
app.register(fastifyView, {
    engine: {
        ejs
    }
})
app.register(fastifyStatic, {
    root: [
        join(rootDir, 'public'), // Pour servir les fichiers statiques depuis 'public'
        join(rootDir, 'src'),
        join(rootDir, 'node_modules')     // Pour servir les fichiers statiques depuis 'src'
    ]
})
app.register(formbody); // Permet l'utilisation de formulaire par fastify

app.register(fastifyMultipart, { // Permet d'utiliser des input type file et de les paramétrer
    limits: {
        fileSize: 1024 * 1024 * 5,  // Limite de taille du fichier, par exemple 5MB
        files: 1  // Nombre maximum de fichiers téléchargeables
    }
});
app.register(fastifySecureSession, { // Ajoute la fonction de session pour l'utilisateur avec les cookies etc
    cookieName: 'session',
    key: readFileSync(join(rootDir, 'secret-key')),
    cookie: { // Précise sur toutes les pages pour l'activité du cookie
        path: '/'
    }
})

// Accueil
app.get('/', listeEvent);
// Création d'un compte
app.get('/register', createAccount);
app.post('/register', createAccount);
// Connexion
app.get('/login', loginAction);
app.post('/login', loginAction);
// Déconnexion
app.get('/logout', logoutAction);
// Création d'un évènement
app.get('/creation', createEvent);
app.post('/creation', createEvent);
// Création d'un mot clé
app.get('/motsCles', createKeyWords);
app.post('/motsCles', createKeyWords);
// Page d'un évènement
app.get('/evenement/:id', showEvent);
app.post('/evenement/:id', showEvent);

// Page de modification d'un evenement
app.get('/modifierEvenement/:id', modifierEvenement);
app.post('/modifierEvenement/:id', modifierEvenement);

// Page Mes évènements actifs
app.get('/mesEvenements/actif/:id', showMyEventActive)
// Page Mes évènements passés
app.get('/mesEvenements/passes/:id', showMyEventPasted)

// Page des participations
app.get('/participations/:id', showParticipations)
// Inscription à un évènement
app.get('/participation/:id', participyEvent)
// Désinscription d'une participation
app.get('/desinscription/:id',unsubscribeEvent)

// Anuler un évènement
app.get('/cancel/:id',cancelEvent)
// Réactiver un évènement
app.get('/activate/:id',activateEvent)
// Supprimer un évènement
app.get('/delete/:id',deleteEvent)

// Profil de l'utilisateur
app.get('/profil/:id', showProfil);
// Page de modification de profil
app.get('/modification/profil/:id', modifyProfil)
app.post('/modification/profil/:id', modifyProfil)

//Page de messagerie
app.get('/messagerie/:id', showMessagerie)
app.post('/messagerie/:id', showMessagerie)
// Page de la discussion
app.get('/discussion/:id', showDiscussion)
app.post('/discussion/:id', showDiscussion)

// Page évaluation d'un évènement
app.get('/evaluation/:id', makeEvaluation)
app.post('/evaluation/:id', makeEvaluation)

// Page API Event
app.get('/api/events/:id', async (req, res) => { 
    const userId = req.params.id; // Id user dans l'url
    try {
        const [result] = await connection.promise().query('SELECT * FROM participation INNER JOIN evenement ON participation.evenement_id = evenement.id WHERE participation.user_id = ?', [userId]);
        
        if (result && result.length > 0) { // On parcout toutes les participations
            const tabEventJSON = result.map(event => ({ // On les met sous un format compréhensible par le calendrier
                title: event.titre,
                start: event.date_debut_evenement.toISOString(), // Convertir les dates en chaînes de caractères
                end: event.date_fin_evenement.toISOString(), // Convertir les dates en chaînes de caractères
                url : `/evenement/${event.id}`
            }));
            res.send(tabEventJSON);
        } else {
            console.log('No events found for user');
            res.json([]); // Retourner un tableau vide si aucune participation n'est trouvée
        }
    }catch (error) {
        res.status(500).send('Erreur serveur');
    }
});
// Page test
app.get('/test/:id', getTest)
app.post('/test/:id', getTest)
// Lancement du serveur avec le port choisi etc localhost:3000
const start = async () => {
    try {
        await app.listen({ port: 3000 })
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}
//Lancement du serveur
start()
