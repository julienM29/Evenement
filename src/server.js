
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

import { listeEvent, showEvent, createEvent, createKeyWords, modifierEvenement, getTest } from "./actions/evenement.js";
import { createAccount, loginAction, logoutAction } from "./actions/auth.js";
import { showProfil } from "./actions/profil.js";


const app = fastify() // Création d'une instance fastify
const rootDir = dirname(dirname(fileURLToPath(import.meta.url))) // Route du projet dans les fichiers de l'ordinateur
// Paramètre de la vue utilisé par fastify
app.register(fastifyView, {
    engine: {
        ejs
    }
})
app.register(fastifyStatic, {
    root: join(rootDir, 'public')
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
    cookie: {
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
app.get('/modifierEvenement/:id', modifierEvenement);
app.post('/modifierEvenement/:id', modifierEvenement);

// Profil de l'utilisateur
app.get('/profil/:id', showProfil);

// Page test
app.get('/test', getTest)
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
