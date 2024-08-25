import connection from "../database.js"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs";
import { pipeline } from "stream/promises"; // Utilisation de pipeline pour la copie du fichier
import { nbNotifEvenement, nbNotifMessage } from "../discussion.js";
import { formatDate } from "./evenement.js";
import argon2 from "argon2";

const rootDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const imagesDir = join(rootDir, 'public', 'images');

// Page Affichant le profil
export const showProfil = async (req, res) => {
    const user = req.session.get('user')
    const user_id = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(user_id)
    const nbNotifEventNonLus = await nbNotifEvenement(user_id)
    const profilId = req.params.id; // Récupération de l'id dans l'url
    const [results] = await connection.promise().query('SELECT * FROM user WHERE id =? ', [profilId]);
    const userProfil = results[0] // On récupère les résultats SQL dans un tableau donc obligé de passer par une variable tableau
    const [evaluations] = await connection.promise().query(`
        SELECT eval.evenement_id, eval.evaluation, eval.commentaire, eval.date, event.titre , l.nom_ville 
        FROM evenement.evaluation eval 
        inner join evenement event on event.id = eval.evenement_id 
        inner join lieu l on event.lieu_id = l.id
        where user_id = ?
        `, [user_id])
    const [evenementsActifs] = await connection.promise().query(`
        SELECT titre, description, photo, date_final_inscription, organisateur_id, date_debut_evenement, date_fin_evenement, nb_participants_max, nbParticipants, statut_id , l.nom_ville
        FROM evenement e
        inner join lieu l on l.id = e.lieu_id
        where organisateur_id = ? and statut_id = 1 order by date_debut_evenement ASC;`, [user_id])
    const [evenementsFinis] = await connection.promise().query(`
        SELECT titre, description, photo, date_final_inscription, organisateur_id, date_debut_evenement, date_fin_evenement, nb_participants_max, nbParticipants, statut_id, l.nom_ville
        FROM evenement e
        inner join lieu l on l.id = e.lieu_id
        where organisateur_id = ? and statut_id = 2 order by date_debut_evenement ASC;`, [user_id])
        const evaluationsAvecDate = await Promise.all(evaluations.map(async evaluation => {
            const dateEvaluation = formatDate(evaluation.date);
            return { 
                ...evaluation,
                dateEvaluation: dateEvaluation,
            };
        }));
        const evenementsActifsAvecDate = await Promise.all(evenementsActifs.map(async evenementActif => {
            const dateDebutEvenement = formatDate(evenementActif.date_debut_evenement);
            const dateFinEvenement = formatDate(evenementActif.date_fin_evenement);
            return { 
                ...evenementActif,
                dateDebutEvenement: dateDebutEvenement,
                dateFinEvenement: dateFinEvenement
            };
        }));
        const evenementsFinisAvecDate = await Promise.all(evenementsFinis.map(async evenementFini => {
            const dateDebutEvenement = formatDate(evenementFini.date_debut_evenement);
            const dateFinEvenement = formatDate(evenementFini.date_fin_evenement);
            return { 
                ...evenementFini,
                dateDebutEvenement: dateDebutEvenement,
                dateFinEvenement: dateFinEvenement
            };
        }));

    return res.view('templates/profil.ejs', {
        userProfil: userProfil,
        user: user,
        nbNotifMessageNonLus:nbNotifMessageNonLus,
        nbNotifEventNonLus: nbNotifEventNonLus,
        evaluations: evaluationsAvecDate,
        evenementsActifs: evenementsActifsAvecDate,
        evenementsFinis: evenementsFinisAvecDate
    })
}
// Page de modification d'un profil
export const modifyProfil = async (req, res) => {
    const userId = req.params.id; // Récupération de l'id du profil dans l'url
    const user = req.session.get('user') // User connecté
    if (req.method === 'GET') { // Si on affiche la page
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
        // Mettre à jour les informations de l'utilisateur connecté si il a modifié ses informations
        if (user.id === parseInt(userId)) {
            user.nom = nom;
            user.prenom = prenom;
            if (photoFileName) {
                user.photo = photoFileName;
            }
            req.session.set('user', user);
        }
        res.redirect(`/profil/${userId}`)

    }

}
export const modifyProfilPassword = async (req, res) => {
    const id = req.params.id;
    const { ancienMotDePasse, nouveauMotDePasse, confirmationMotDePasse } = req.body;

    const [profil] = await connection.promise().query('SELECT * FROM user WHERE id = ?', [id]);
    const user = profil[0];

    // Vérification de l'ancien mot de passe
    const isMatch = await argon2.verify(user.password, ancienMotDePasse);
    
    if (!isMatch) {
        // Retourne une erreur si l'ancien mot de passe ne correspond pas
        return reply.status(400).send({ error: 'L\'ancien mot de passe est incorrect' });
    }

    // Vérification de la correspondance des nouveaux mots de passe
    if (nouveauMotDePasse !== confirmationMotDePasse) {
        return reply.status(400).send({ error: 'Les nouveaux mots de passe ne correspondent pas' });
    }

    // Hacher le nouveau mot de passe et le sauvegarder
    const hashedPassword = await argon2.hash(nouveauMotDePasse);
    await connection.promise().query('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, id]);

    // Rediriger vers la page de profil après succès
    return res.redirect(`/profil/${id}`);
};
