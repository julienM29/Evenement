import connection from "../database.js"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs";
import { pipeline } from "stream/promises"; // Utilisation de pipeline pour la copie du fichier
import { nbNotifEvenement, nbNotifMessage } from "../discussion.js";

const rootDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const imagesDir = join(rootDir, 'public', 'images');

// Page Affichant le profil
export const showProfil = async (req, res) => {
    const user = req.session.get('user')
    const user_id = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(user_id)
    const nbNotifEventNonLus = await nbNotifEvenement(user_id)
    const postId = req.params.id; // Récupération de l'id dans l'url

    const [results] = await connection.promise().query('SELECT * FROM user WHERE id =? ', [postId]);
    const userProfil = results[0] // On récupère les résultats SQL dans un tableau donc obligé de passer par une variable tableau
    return res.view('templates/profil.ejs', {
        userProfil: userProfil,
        user: user,
        nbNotifMessageNonLus:nbNotifMessageNonLus,
        nbNotifEventNonLus: nbNotifEventNonLus
    })
}
// Page de modification d'un profil
export const modifyProfil = async (req, res) => {
    const userId = req.params.id; // Récupération de l'id du profil dans l'url
    if (req.method === 'GET') { // Si on affiche la page
        const user = req.session.get('user') // User connecté
        const user_id = user.id
        const nbNotifMessageNonLus = await nbNotifMessage(userId)
        const nbNotifEventNonLus = await nbNotifEvenement(userId)

        const [results] = await connection.promise().query('SELECT * FROM user WHERE id =? ', [userId]); // Récupération des infos
        const userProfil = results[0] // On récupère les résultats SQL dans un tableau donc obligé de passer par une variable tableau

        return res.view('templates/modificationProfil.ejs', { // Retourne la vue
            userProfil: userProfil,
            user: user,
            nbNotifMessageNonLus: nbNotifMessageNonLus,
            nbNotifEventNonLus: nbNotifEventNonLus
        })
    }
    if (req.method === 'POST') { // Si le formulaire est submit
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
        const { nom, prenom, email } = fields; // Déstructuration pour récupérer les valeurs du formulaire
        if (photoFileName === null || photoFileName === undefined) { // Pas de photo submit
            await connection.promise().query('UPDATE user SET nom = ?, prenom = ?, email = ? WHERE id = ?',
                [nom, prenom, email, userId]
            )
        } else { // Une photo submit
            await connection.promise().query('UPDATE user SET nom = ?, prenom = ?, email = ?, photo = ?  WHERE id = ?',
                [nom, prenom, email, photoFileName, userId]
            )
        }
        res.redirect(`/profil/${userId}`)

    }

}