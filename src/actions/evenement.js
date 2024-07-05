import connection from "../database.js"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs";
import { pipeline } from "stream/promises"; // Utilisation de pipeline pour la copie du fichier


const rootDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const imagesDir = join(rootDir, 'public', 'images');

////////////////// Fonction de modification des informations sur les évènements pour récupérer ceux liés aux tables User et Mots clés ////////////////////////////////////////

// Fonction pour formatter la date
const formatDate = (dateString) => {
    const dateObj = new Date(dateString);
    const jour = dateObj.getDate().toString().padStart(2, '0');
    const mois = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const annee = dateObj.getFullYear();

    return `${annee}-${mois}-${jour}`;
};

// Fonction pour récupérer les mots clés et leurs id
const idKeyWords = async (id) => {
    const [mots_cles_id] = await connection.promise().query('SELECT mot_cle_id FROM evenement_mots_cles WHERE evenement_id = ?', [id]); // Récupère tout les id des mots clés de la table de jointure en fonction de l'id de l'évènement
    return mots_cles_id.map(row => row.mot_cle_id); // Permet de transformer le tableau d'objet en seulement un tableau contenant les id
}

// Fonction pour récréer le tableau d'information des évènements
const makeEventTab = async (Events, motsCles) => {
    // Récupérer tous les utilisateurs et les mots clés en une seule requête
    const [utilisateurs] = await connection.promise().query('SELECT id, nom, prenom FROM user');
    // Créer des maps pour un accès rapide par ID
    const utilisateursMap = new Map(utilisateurs.map(user => [user.id, user]));
    const motsClesMap = new Map(motsCles.map(mot => [mot.id, mot]));

    if (Events.length > 1) { // Si il y a plusieurs évènements à modifier
        console.log('je suis dans le cas où il y a plusieurs évènements à modifier ! ')
        // Mapper les événements avec les détails
        const evenementsAvecDetails = await Promise.all(Events.map(async evenement => {
            const motsClesIds = await idKeyWords(evenement.id);
            return {
                ...evenement,
                motsCles: motsClesIds.map(id => motsClesMap.get(id)),
                date_final_inscription: formatDate(evenement.date_final_inscription),
                date_debut_evenement: formatDate(evenement.date_debut_evenement),
                date_fin_evenement: formatDate(evenement.date_fin_evenement),
                organisateur: utilisateursMap.get(evenement.organisateur_id),
            };
        }));
        return evenementsAvecDetails;
    }

    if (Events.length === 1) { // Si il n'y a qu'un évènement à modifier
        console.log('je suis dans le cas où il y a un évènement seulement')
        const evenement = Events[0];
        const motsClesIds = await idKeyWords(evenement.id);
        // Mapper l'événement avec les détails
        const evenementAvecDetails = {
            ...evenement,
            motsCles: motsClesIds.map(id => motsClesMap.get(id)),
            date_final_inscription: formatDate(evenement.date_final_inscription),
            date_debut_evenement: formatDate(evenement.date_debut_evenement),
            date_fin_evenement: formatDate(evenement.date_fin_evenement),
            organisateur: utilisateursMap.get(evenement.organisateur_id),
        };
        return [evenementAvecDetails]; // Retourner un tableau contenant l'événement avec détails
    }

    return []; // Si Events est vide ou non défini, retourner un tableau vide ou gérer en conséquence
};

const addOrModifyEvent = async (parts,userId, modify, eventId) => {

        let fields = {}; // Permet de contenir les champs textes
        let photoFileName = null; // Stcok le nom de la photo
        let motsClesIds = []; // Tableau pour stocker les IDs des mots clés
        for await (const part of parts) {
            if (part.file) { // Si la partie est un fichier
                if (part.fieldname === 'photo') { // Si c'est une photo
                    console.log('il y a une photo')
                    const filename = `${part.filename}`; // Nom du fichier
                    console.log(filename)
                    const saveTo = join(imagesDir, filename); // Route pour la sauvegarde du fichier
                    await pipeline(part.file, fs.createWriteStream(saveTo));// Utilise pipeline pour copier le fichier dans le dossier images
                    photoFileName = filename; // Stocke le nom de la photo dans une variable pour l'insertion en base de donnée
                }
            } else {
                if (part.fieldname === 'motsCles[]') {
                    motsClesIds.push(parseInt(part.value)); // Ajouter l'ID du mot clé au tableau
                } else {
                    fields[part.fieldname] = part.value;
                }
            }
        }
        const { titre, lieu, description, dateInscription, dateDebut, dateFin, nbParticipants } = fields; // Déstructuration pour récupérer les valeurs du formulaire
        if (!modify) { // Cas d'une insertion
            console.log('création')
            // Insertion de l'événement dans la table evenement
            const [event] = await connection.promise().query(
                'INSERT INTO evenement (titre, lieu, description, photo, date_final_inscription, date_debut_evenement,date_fin_evenement, nb_participants_max, places_dispo, statut, organisateur_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [titre, lieu, description, photoFileName, dateInscription, dateDebut, dateFin, nbParticipants,nbParticipants, 0, userId]
            );

            eventId = event.insertId;
            console.log('Événement créé avec succès. ID :', eventId);


        }
        if (modify) { // Cas d'une modification
            console.log('modification' + photoFileName)
            await connection.promise().query('UPDATE evenement SET titre = ?, lieu = ?, description = ?,photo = ?, date_final_inscription = ?, date_debut_evenement = ?, date_fin_evenement =?, nb_participants_max = ?, statut =?  WHERE id = ?',
                [titre, lieu, description, photoFileName, dateInscription, dateDebut, dateFin, nbParticipants,nbParticipants, eventId]
            )
            await connection.promise().query('DELETE FROM evenement.evenement_mots_cles WHERE evenement_id=?', [eventId])

        }
        // Insertion des relations dans la table evenement_mots_cles
        if (motsClesIds && motsClesIds.length > 0) {
            for (const motCleId of motsClesIds) {
                await connection.promise().query(
                    'INSERT INTO evenement_mots_cles (evenement_id, mot_cle_id) VALUES (?, ?)',
                    [eventId, motCleId]
                );
            }
        }
}
///////////////////////////////////////////////////// FIN DES FONCTIONS POUR LES EVENEMENTS ///////////////////////////////////////////////////////////////////////////

////////// AFFICHAGE /////////

// Page d'accueil listant les évènements
export const listeEvent = async (req, res) => {
    try {
        // Récupérer tous les événements
        const [evenements] = await connection.promise().query('SELECT * FROM evenement');
        const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');

        // Appeler la fonction pour obtenir les détails des événements
        const evenementsAvecDetails = await makeEventTab(evenements, motsCles);

        return res.view('/templates/index.ejs', { // Appel du fichier ejs
            evenements: evenementsAvecDetails || [],
            user: req.session.get('user')
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des événements :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}
// Permet d'afficher un évènement
export const showEvent = async (req, res) => {
    const eventId = req.params.id
    const [evenement] = await connection.promise().query('SELECT * FROM evenement WHERE id =?', [eventId])
    const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');
    const evenementsAvecDetails = await makeEventTab(evenement, motsCles)
    return res.view('templates/showEvenement.ejs', {
        evenement: evenementsAvecDetails[0],
        motsCles: motsCles,
        user: req.session.get('user')
    })
}

////////// CREATION ET MODIFICATION /////////

// Page de création d'un évènement
export const createEvent = async (req, res) => {
    const eventId =null
    if (req.method === 'GET') {
        try {
            const [motsCles] = await connection.promise().query('SELECT * FROM mots_cles');
            return res.view('templates/creation.ejs', {
                user: req.session.get('user'),
                motsCles: motsCles
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mots clés :', error);
            return res.status(500).send('Erreur interne du serveur');
        }
    }

    if (req.method === 'POST') {
        try {
            const user = req.session.get('user');
            const userId = user.id
            if (!user) {
                return res.status(401).send('Utilisateur non authentifié');
            }

            const parts = req.parts(); // Récupère les parties du formulaire utilisant multipart fastify
            const modify = false
            await addOrModifyEvent(parts,userId, modify,eventId) // Appel de la fonction qui envoie en base de donnée

            res.redirect('/'); // Redirection après la création de l'événement
        } catch (error) {
            console.error('Erreur lors de la création de l\'événement :', error);
            return res.status(500).send('Erreur interne du serveur');
        }
    }
};

// Page de modification d'un évènement
export const modifierEvenement = async (req, res) => {
    const eventId = req.params.id
    if (req.method === 'GET') { // Requete GET affichage de la page
        const [evenement] = await connection.promise().query('SELECT * FROM evenement WHERE id =?', [eventId])
        const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');
        const evenementsAvecDetails = await makeEventTab(evenement, motsCles)
        return res.view('templates/modifierEvenement.ejs', {
            evenement: evenementsAvecDetails[0],
            motsCles: motsCles,
            user: req.session.get('user')
        })
    }
    if (req.method === 'POST') { // Requete POST soumission du formulaire
        const user = req.session.get('user')
        const userId = user.id;
        const parts = req.parts(); // Récupère les parties du formulaire utilisant multipart fastify
        const modify = true
        await addOrModifyEvent(parts,userId, modify,eventId)
        console.log('l évènement a été modifié')
        res.redirect('/')
    }
}

///////////////////////////// MOTS CLES  /////////////////////////////

// Page de création de mots clés
export const createKeyWords = async (req, res) => {
    if (req.method === 'GET') { // Affichage
        return res.view('templates/motsCles.ejs', { error: null });
    }
    if (req.method === 'POST') { // Soumission du formulaire
        const nom = req.body.nom
        const [result] = await connection.promise().query('SELECT * FROM mots_cles WHERE nom =? ', [nom]);
        if (result.length === 0) { // Si le mot clé n'existe pas
            await connection.promise().query('INSERT INTO mots_cles (nom) VALUES (?)', [nom]);
            console.log('mot clé créé avec succès');
            res.redirect('/motsCles'); // Redirigez l'utilisateur après la création du compte
        } else { // Si le mot clé existe déjà -> redirection 
            console.log('mot clé existe déjà en base de donnée');
            return res.view('templates/motsCles.ejs', { error: 'Le mot clé existe déjà en base de données.' });
        }

    }
}

export const getTest = (req,res)=>{
    return res.view('templates/test.ejs',{
        user: req.session.get('user')
    })
}

