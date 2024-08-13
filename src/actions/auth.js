import connection from "../database.js";
import argon2 from "argon2";
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs";
import { pipeline } from "stream/promises"; // Utilisation de pipeline pour la copie du fichier

const rootDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const imagesDir = join(rootDir, 'public', 'images');

export const createAccount = async (req, res) => {
    if (req.method === 'GET') {
        return res.view('templates/register.ejs')
    }
    if (req.method === 'POST') {
        try {
            const parts = req.parts();
            let fields = {}; // Permet de contenir les champs textes
            let photoFileName = null; // Stcok le nom de la photo
            for await (const part of parts) {
                if (part.file) { // Si la partie est un fichier
                    if (part.fieldname === 'photo') { // Si c'est une photo
                        console.log('il y a une photo')
                        const filename = `${part.filename}`; // Nom du fichier
                        if (filename) {
                            const saveTo = join(imagesDir, filename); // Route pour la sauvegarde du fichier
                            await pipeline(part.file, fs.createWriteStream(saveTo));// Utilise pipeline pour copier le fichier dans le dossier images
                            photoFileName = filename; // Stocke le nom de la photo dans une variable pour l'insertion en base de donnée   
                        }
                    }
                } else {
                    fields[part.fieldname] = part.value;
                }
            }
            const { nom, prenom, email, password } = fields; // Déstructuration pour récupérer les valeurs du formulaire
            const hashPasswordUser = await argon2.hash(password) // Hashage du mot de passe en passant par argon2
            await connection.promise().query('INSERT INTO user (nom, prenom, password, email, photo) VALUES (?, ?, ?, ?, ?)', [nom, prenom, hashPasswordUser, email, photoFileName]);
            console.log('Utilisateur créé avec succès');
            res.redirect(`/login`)
        } catch (err) {
            console.error('Erreur lors de la création du post :', err);
            return res.status(500).send('Erreur interne du serveur');
        }
    }
}

// Fonction de connexion 
export const loginAction = async (req, res) => {
    if (req.method === 'POST') {
        const email = req.body.email;
        const motDePasse = req.body.password;
        try {
            const [rows] = await connection.promise().query('SELECT * FROM user WHERE email = ?', [email]);
            if (rows.length === 0) {
                // Aucun utilisateur trouvé avec cet e-mail
                console.log('pas de user trouvé')
                return res.view('templates/login.ejs', { errorEmail: 'Adresse e-mail incorrect.', errorMDP: null, email: null });
                
            }

            const user = rows[0];
            if (await argon2.verify(user.password, motDePasse)) {
                // Authentification réussie
                req.session.set('user', {
                    id: user.id,
                    nom: user.nom,
                    prenom: user.prenom,
                    photo: user.photo
                });
                return res.redirect('/');
            } else {
                // Mot de passe incorrect
                return res.view('templates/login.ejs', { errorEmail: null,errorMDP: 'Mot de passe incorrect.', email: email });
            }
        } catch (err) {
            // Gestion des erreurs
            console.error(err);
            return res.view('templates/login.ejs', { error: 'Une erreur est survenue. Veuillez réessayer plus tard.' });
        }
    } else {
        return res.view('templates/login.ejs', { errorEmail: null, errorMDP: null, email: null });    }
};
// Fonction de déconnexion
export const logoutAction = (req, res) => {
    req.session.delete() // On efface le cookie avec les infos user
    return res.redirect('/login')
}