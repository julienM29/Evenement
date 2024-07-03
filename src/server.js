
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import ejs from 'ejs'
import { readFileSync } from "node:fs";

import fastify from "fastify";
import fastifyView from "@fastify/view"
import fastifyStatic from "@fastify/static"
import formbody from '@fastify/formbody';
import fastifySecureSession from "@fastify/secure-session";

import { listeEvent, showEvent, showProfil, createEvent, createKeyWords, modifierEvenement } from "./actions/evenement.js";
import { createAccount, loginAction, logoutAction } from "./actions/auth.js";


const app = fastify()
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
app.register(fastifyView, {
    engine: {
        ejs
    }
})
app.register(fastifyStatic, {
    root: join(rootDir, 'public')
})
app.register(formbody);
app.register(fastifySecureSession, {
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


const start = async () => {
    try {
        await app.listen({ port: 3000 })
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}
start()
console.log(' start')