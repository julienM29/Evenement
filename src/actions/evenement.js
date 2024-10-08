import connection from "../database.js"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs";
import { pipeline } from "stream/promises"; // Utilisation de pipeline pour la copie du fichier
import { nbNotifEvenement, nbNotifMessage } from "../discussion.js";


const rootDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const imagesDir = join(rootDir, 'public', 'images');

////////////////// Fonction de modification des informations sur les évènements pour récupérer ceux liés aux tables User et Mots clés ////////////////////////////////////////

// Fonction pour formatter la date
export const formatDate = (dateString) => {
    const dateObj = new Date(dateString);
    const jour = dateObj.getDate().toString().padStart(2, '0');
    const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const moisNom = moisNoms[(dateObj.getMonth())];
    const mois = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const annee = dateObj.getFullYear();
    const heures = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');

    return {
        jour,
        mois,
        annee,
        moisNom,
        heures,
        minutes,
        dateFormatee: `${jour}-${mois}-${annee} ${heures}:${minutes}`,
        dateBDD: `${annee}-${mois}-${jour} ${heures}:${minutes}`
    };
};
export const formatDateInput = (dateString) => {
    const dateObj = new Date(dateString);
    const jour = dateObj.getDate().toString().padStart(2, '0');
    const mois = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const annee = dateObj.getFullYear();
    const heures = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${annee}-${mois}-${jour}T${heures}:${minutes}`;
};


const addOrModifyEvent = async (parts, userId, modify, eventId) => {
    let fields = {}; // Contient les champs textes
    let photoFileName = null; // Stocke le nom de la photo
    let motsClesIds = []; // Tableau pour stocker les IDs des mots clés
    try {
        for await (const part of parts) {
            if (part.file) { // Si la partie est un fichier
                if (part.fieldname === 'photo') { // Si c'est une photo
                    const filename = `${part.filename}`; // Nom du fichier
                    if (filename) {
                        const saveTo = join(imagesDir, filename); // Route pour la sauvegarde du fichier
                        await pipeline(part.file, fs.createWriteStream(saveTo)); // Utilise pipeline pour copier le fichier dans le dossier images
                        photoFileName = filename; // Stocke le nom de la photo dans une variable pour l'insertion en base de donnée   
                    }
                }
            } else {
                if (part.fieldname === 'motsCles[]') {
                    motsClesIds.push(parseInt(part.value)); // Ajouter l'ID du mot clé au tableau
                } else {
                    fields[part.fieldname] = part.value;
                }
            }
        }

        const { titre, lieu, description, dateInscription, dateDebut, dateFin, nbParticipants, inscriptionCheckbox, latitude, longitude, ville } = fields; // Déstructuration pour récupérer les valeurs du formulaire
        let descriptionSansEspaces = description.trim();
        let booleanPendantEvenement = 0
        if (inscriptionCheckbox === "true") {
            booleanPendantEvenement = 1
        }
        // Variables d'insertion
        let valueDateInscription
        if (booleanPendantEvenement === 1) {
            valueDateInscription = null
        } else {
            valueDateInscription = dateInscription
        }
        // Verif lieu existant
        let lieuId;
        const [lieuExistant] = await connection.promise().query(`
            SELECT id 
            FROM evenement.lieu
            WHERE nom_ville = ?
        `, [ville]);
        if(lieuExistant.length >= 1){
            lieuId = lieuExistant[0].id;
        } else {
          const [lieuDB] = await connection.promise().query(
            'INSERT INTO lieu (nom_ville, adresse, latitude, longitude) VALUES (?, ?, ?, ?)',
            [ville,lieu,latitude, longitude ]
        );  
        lieuId = lieuDB.insertId 
        }
        // Insertion ou modification 
        if (!modify) { // Cas d'une insertion
            if(photoFileName === null){
                photoFileName = "illustration.jpg"
            }
            // Insertion de l'événement dans la table evenement
            const [event] = await connection.promise().query(
                'INSERT INTO evenement (titre, lieu_id, description, photo, date_final_inscription, date_debut_evenement, date_fin_evenement, nb_participants_max, nbParticipants, statut_id, organisateur_id, participation_pendant_evenement) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [titre, lieuId, descriptionSansEspaces, photoFileName, valueDateInscription, dateDebut, dateFin, nbParticipants, 0, 1, userId, booleanPendantEvenement]
            );
            eventId = event.insertId;
            console.log('Événement créé avec succès. ID :', eventId);
        } else { // Cas d'une modification
            if (photoFileName === null) {
                await connection.promise().query(
                    'UPDATE evenement SET titre = ?, lieu_id = ?, description = ?, date_final_inscription = ?, date_debut_evenement = ?, date_fin_evenement = ?, nb_participants_max = ?, participation_pendant_evenement = ? WHERE id = ?',
                    [titre, lieuId, descriptionSansEspaces, valueDateInscription, dateDebut, dateFin, nbParticipants, booleanPendantEvenement, eventId]
                );
            } else {
                await connection.promise().query(
                    'UPDATE evenement SET titre = ?, lieu_id = ?, description = ?, photo = ?, date_final_inscription = ?, date_debut_evenement = ?, date_fin_evenement = ?, nb_participants_max = ?, participation_pendant_evenement = ? WHERE id = ?',
                    [titre, lieuId, descriptionSansEspaces, photoFileName, valueDateInscription, dateDebut, dateFin, nbParticipants, booleanPendantEvenement, eventId]
                );
            }
            await connection.promise().query(
                'DELETE FROM evenement_mots_cles WHERE evenement_id = ?',
                [eventId]
            );
            console.log('Événement modifié avec succès. ID :', eventId);
        }

        // Insertion des relations dans la table evenement_mots_cles
        if (motsClesIds.length > 0) {
            for (const motCleId of motsClesIds) {
                await connection.promise().query(
                    'INSERT INTO evenement_mots_cles (evenement_id, mot_cle_id) VALUES (?, ?)',
                    [eventId, motCleId]
                );
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout ou de la modification de l\'événement:', error);
        throw error; // Renvoyer l'erreur pour permettre une gestion appropriée en amont
    }
};

///////////////////////////////////////////////////// FIN DES FONCTIONS POUR LES EVENEMENTS ///////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////// AFFICHAGE ///////////////////////////////////////////////////////////////////////////////////////////////////

// Page d'accueil listant les évènements
export const listeEvent = async (req, res) => {
    const user = req.session.get('user')
    let user_id
    if (user) {
        user_id = user.id
    }

    try {
        // Notification barre de navigation
        const nbNotifMessageNonLus = await nbNotifMessage(user_id)
        const nbNotifEventNonLus = await nbNotifEvenement(user_id)
        const [motsCles] = await connection.promise().query('SELECT * FROM mots_cles');
        // Récupérer tous les événements
        const [evenements] = await connection.promise().query(
            `SELECT e.* , l.nom_ville
             FROM evenement e
             inner join lieu l on l.id = e.lieu_id
             WHERE e.statut_id = 1 or e.statut_id = 5 and e.participation_pendant_evenement = 1
             order by e.date_debut_evenement ASC
            `)
            await updateEventStatut(evenements) // Parcout tous les évèments pour mettre à jour le statut en fonction des dates de début et de fin
        const evenementsAvecDetails = await Promise.all(evenements.map(async evenement => {
            return { // On modifie les dates et les mots clés ainsi que l'organisateur pour ne pas avoir un id mais des données
                ...evenement,
                date_final_inscription: formatDate(evenement.date_final_inscription),
                date_debut_evenement: formatDate(evenement.date_debut_evenement),
                date_fin_evenement: formatDate(evenement.date_fin_evenement),
            };
        }));
        return res.view('/templates/index.ejs', { // Appel du fichier ejs
            evenements: evenementsAvecDetails || [],
            user: user,
            motsCles: motsCles,
            nbNotifMessageNonLus: nbNotifMessageNonLus,
            nbNotifEventNonLus: nbNotifEventNonLus

        });
    } catch (error) {
        console.error('Erreur lors de la récupération des événements :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}
// Permet d'afficher un évènement et de le modifier si tu es organisateur
export const showEvent = async (req, res) => {
    const eventId = req.params.id
    const user = req.session.get('user')
    const userId = user.id;
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)
    const [users] = await connection.promise().query('SELECT * FROM user where user.id != ?',[userId]); // Liste des utilisateurs pour partager l'évènement
    if (req.method === 'GET') { // Requete GET affichage de la page
        const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');
        const [evenements] = await connection.promise().query(
            `SELECT evenement.*, 
                 GROUP_CONCAT(mots_cles.nom SEPARATOR ',') AS motsCles,
                 user.prenom AS organisateurPrenom, user.nom AS organisateurNom,
                 l.id as lieu_id, l.nom_ville as nom_ville, l.adresse as adresse, l.latitude as latitude, l.longitude as longitude
                 FROM evenement 
                 INNER JOIN evenement_mots_cles ON evenement.id = evenement_mots_cles.evenement_id 
                 INNER JOIN mots_cles ON mots_cles.id = evenement_mots_cles.mot_cle_id 
                 INNER JOIN user ON user.id = evenement.organisateur_id
                 INNER JOIN lieu l on l.id = evenement.lieu_id
                 WHERE evenement.id = ?
                 GROUP BY evenement.id`, [eventId]
        );
        let enCours = await verifyDateEvent(evenements[0]) 
        const evenementsAvecDetails = await Promise.all(evenements.map(async evenement => {
            const dateFinalInscription = formatDate(evenement.date_final_inscription);
            const dateDebutEvenement = formatDate(evenement.date_debut_evenement);
            const dateFinEvenement = formatDate(evenement.date_fin_evenement);
            const dateFinalInscriptionInput = formatDateInput(evenement.date_final_inscription);
            const dateDebutEvenementInput = formatDateInput(evenement.date_debut_evenement);
            const dateFinEvenementInput = formatDateInput(evenement.date_fin_evenement);
            const motsClesArray = evenement.motsCles.split(',');
            return { // On modifie les dates et les mots clés ainsi que l'organisateur pour ne pas avoir un id mais des données
                ...evenement,
                date_final_inscription: dateFinalInscription,
                date_debut_evenement: dateDebutEvenement,
                date_fin_evenement: dateFinEvenement,
                dateDebutEvenementInput: dateDebutEvenementInput,
                dateFinalInscriptionInput: dateFinalInscriptionInput,
                dateFinEvenementInput: dateFinEvenementInput,
                motsCles: motsClesArray.map(mot => mot.trim())
            };
        }));
        const [search] = await connection.promise().query('SELECT * FROM participation WHERE evenement_id =? AND user_id =?', [eventId, userId])

        let participation = false // Permet d'afficher ou d'enlever le bouton de participation à l'évènement
        if (search.length > 0) {
            participation = true
        }
        return res.view('templates/showEvenement.ejs', {
            evenement: evenementsAvecDetails[0],
            motsCles: motsCles,
            participation: participation,
            enCours: enCours,
            nbNotifMessageNonLus: nbNotifMessageNonLus,
            nbNotifEventNonLus: nbNotifEventNonLus,
            user: user,
            users: users
        })
    }
}

//Page affichant ces évènements actifs
export const showMyEvent = async (req, res) => {
    const user = req.session.get('user')
    const userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)
    try {
        const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');
        const [evenements] = await connection.promise().query(
            `SELECT evenement.*, 
             GROUP_CONCAT(mots_cles.nom SEPARATOR ',') AS motsCles,
             l.id as lieu_id, l.nom_ville as nom_ville, l.adresse as adresse, l.latitude as latitude, l.longitude as longitude
             FROM evenement.evenement 
             INNER JOIN evenement.evenement_mots_cles ON evenement.id = evenement_mots_cles.evenement_id 
             INNER JOIN evenement.mots_cles ON mots_cles.id = evenement_mots_cles.mot_cle_id 
             INNER JOIN lieu l on l.id = evenement.lieu_id
             WHERE evenement.organisateur_id = ? and (evenement.statut_id = 1 or  evenement.statut_id = 5)
             GROUP BY evenement.id`, [userId])
        const evenementsAvecDetails = await Promise.all(evenements.map(async evenement => {
            const motsClesArray = evenement.motsCles.split(',');
            return { // On modifie les dates et les mots clés ainsi que l'organisateur pour ne pas avoir un id mais des données
                ...evenement,
                date_final_inscription: formatDate(evenement.date_final_inscription),
                date_debut_evenement: formatDate(evenement.date_debut_evenement),
                date_fin_evenement: formatDate(evenement.date_fin_evenement),
                motsCles: motsClesArray.map(mot => mot.trim())
            };
        }));
        return res.view('templates/showMyActiveEvent.ejs',
            {
                user: user,
                evenements: evenementsAvecDetails,
                nbNotifMessageNonLus: nbNotifMessageNonLus,
                nbNotifEventNonLus: nbNotifEventNonLus,
                motsCles: motsCles
            }
        )
    } catch (error) {
        console.error('Erreur lors de la récupération des événements :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}

//////////////////////////////////////////////////////////// PARTICIPATION A UN EVENT ////////////////////////////////////////////

// Lorsque l'utilisateur appuye sur le bouton pour valider sa participation sur la page showEvent
export const participyEvent = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const eventId = req.params.id
            const user = req.session.get('user');
            const userId = user.id
            if (!user) {
                return res.status(401).send('Utilisateur non authentifié');
            }
            await connection.promise().query(
                'INSERT INTO participation (evenement_id, user_id) VALUES (?, ?)',
                [eventId, userId]
            );
            await connection.promise().query('UPDATE evenement SET nbParticipants = nbParticipants + 1  WHERE id = ?',
                [eventId]
            )
            res.redirect('/'); // Redirection après la création de l'événement
        } catch (error) {
            console.error('Erreur lors de la création de l\'événement :', error);
            return res.status(500).send('Erreur interne du serveur');
        }
    }
}

//////////////////////////////////////////////////////////// SE DESINSCRIRE A UN EVENT ////////////////////////////////////////////

// Lorsque l'utilisateur appuye sur le bouton pour valider sa participation sur la page showEvent
export const unsubscribeEvent = async (req, res) => {

    try {
        const eventId = req.params.id
        const user = req.session.get('user');
        const userId = user.id
        if (!user) {
            return res.status(401).send('Utilisateur non authentifié');
        }

        await connection.promise().query(
            'DELETE FROM participation WHERE evenement_id =? AND user_id = ?',
            [eventId, userId]
        );
        await connection.promise().query('UPDATE evenement SET nbParticipants = nbParticipants - 1  WHERE id = ?',
            [eventId]
        )
        res.redirect('/'); // Redirection après la création de l'événement
    } catch (error) {
        console.error('Erreur lors de la suppression de la participation :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}
/////////////////////////////////////////////////////// CREATION ET MODIFICATION //////////////////////////////////////////////////////

// Page de création d'un évènement
export const createEvent = async (req, res) => {
    const user = req.session.get('user')
    const userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)

    if (req.method === 'GET') { // Affichage formulaire
        try {
            const [motsCles] = await connection.promise().query('SELECT * FROM mots_cles');
            return res.view('templates/creation.ejs', {
                user: user,
                motsCles: motsCles,
                nbNotifMessageNonLus: nbNotifMessageNonLus,
                nbNotifEventNonLus: nbNotifEventNonLus
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mots clés :', error);
            return res.status(500).send('Erreur interne du serveur');
        }
    }

    if (req.method === 'POST') { // Soumission du formulaire
        try {
            const user = req.session.get('user');
            const userId = user.id
            const eventId = 0
            if (!user) {
                return res.status(401).send('Utilisateur non authentifié');
            }

            const parts = req.parts(); // Récupère les parties du formulaire utilisant multipart fastify
            const modify = false // Permet de passer dans la création d'un évènement
            await addOrModifyEvent(parts, userId, modify, eventId) // Appel de la fonction qui envoie en base de donnée

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
    const user = req.session.get('user')
    const userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)

    if (req.method === 'GET') { // Requete GET affichage de la page
        const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');
        const [evenements] = await connection.promise().query(
            `SELECT evenement.*, 
                 GROUP_CONCAT(mots_cles.nom SEPARATOR ',') AS motsCles,
                 user.prenom AS organisateurPrenom, user.nom AS organisateurNom,
                 l.id as lieu_id, l.nom_ville as nom_ville, l.adresse as adresse, l.latitude as latitude, l.longitude as longitude
                 FROM evenement 
                 INNER JOIN evenement_mots_cles ON evenement.id = evenement_mots_cles.evenement_id 
                 INNER JOIN mots_cles ON mots_cles.id = evenement_mots_cles.mot_cle_id 
                 INNER JOIN user ON user.id = evenement.organisateur_id
                 INNER JOIN lieu l on l.id = evenement.lieu_id
                 WHERE evenement.id = ?
                 GROUP BY evenement.id`, [eventId]
        );
        const evenementsAvecDetails = await Promise.all(evenements.map(async evenement => {
            const dateFinalInscription = formatDate(evenement.date_final_inscription);
            const dateDebutEvenement = formatDate(evenement.date_debut_evenement);
            const dateFinEvenement = formatDate(evenement.date_fin_evenement);
            const dateFinalInscriptionInput = formatDateInput(evenement.date_final_inscription);
            const dateDebutEvenementInput = formatDateInput(evenement.date_debut_evenement);
            const dateFinEvenementInput = formatDateInput(evenement.date_fin_evenement);
            const motsClesArray = evenement.motsCles.split(',');
            return { // On modifie les dates et les mots clés ainsi que l'organisateur pour ne pas avoir un id mais des données
                ...evenement,
                date_final_inscription: dateFinalInscription,
                date_debut_evenement: dateDebutEvenement,
                date_fin_evenement: dateFinEvenement,
                dateDebutEvenementInput: dateDebutEvenementInput,
                dateFinalInscriptionInput: dateFinalInscriptionInput,
                dateFinEvenementInput: dateFinEvenementInput,
                motsCles: motsClesArray.map(mot => mot.trim())
            };
        }));
        console.log(evenementsAvecDetails.statut_id)
        return res.view('templates/modifierEvenement.ejs', {
            evenement: evenementsAvecDetails[0],
            motsCles: motsCles,
            user: user,
            nbNotifMessageNonLus: nbNotifMessageNonLus,
            nbNotifEventNonLus: nbNotifEventNonLus
        })
    }
    if (req.method === 'POST') { // Requete POST soumission du formulaire
        const user = req.session.get('user')
        const userId = user.id;
        const parts = req.parts(); // Récupère les parties du formulaire utilisant multipart fastify
        const modify = true // Modification d'un évènement
        await addOrModifyEvent(parts, userId, modify, eventId)
        res.redirect('/')
    }
}
export const cancelEvent = async (req, res) => {
    try {
        const eventId = req.params.id
        await connection.promise().query('UPDATE evenement SET statut_id =  3  WHERE id = ?',
            [eventId]
        )
        res.redirect('/'); // Redirection après la création de l'événement
    } catch (error) {
        console.error('Erreur lors de l annulation de l evenement :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}
export const activateEvent = async (req, res) => {
    try {
        const eventId = req.params.id
        await connection.promise().query('UPDATE evenement SET statut_id =  1  WHERE id = ?',
            [eventId]
        )
        res.redirect('/'); // Redirection après la création de l'événement
    } catch (error) {
        console.error('Erreur lors de l activation d un évènement :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}
export const deleteEvent = async (req, res) => {
    console.log('delete :' + req.params.id)
    try {
        const eventId = req.params.id
        await connection.promise().query('UPDATE evenement SET statut_id =  4  WHERE id = ?',
            [eventId]
        )
        res.redirect('/'); // Redirection après la création de l'événement
    } catch (error) {
        console.error('Erreur lors de la suppression de l evenement :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}


///////////////////////////// MOTS CLES  /////////////////////////////

// Page de création de mots clés
export const createKeyWords = async (req, res) => {
    const user = req.session.get('user')
    const userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)

    if (req.method === 'GET') { // Affichage
        return res.view('templates/motsCles.ejs',
            {
                user: user,
                nbNotifMessageNonLus: nbNotifMessageNonLus,
                nbNotifEventNonLus: nbNotifEventNonLus,
                error: null
            });
    }
    if (req.method === 'POST') { // Soumission du formulaire
        const nom = req.body.nom
        const [result] = await connection.promise().query('SELECT * FROM mots_cles WHERE nom =? ', [nom]);
        if (result.length === 0) { // Si le mot clé n'existe pas
            await connection.promise().query('INSERT INTO mots_cles (nom) VALUES (?)', [nom]);
            res.redirect('/motsCles'); // Redirigez l'utilisateur après la création du compte
        } else { // Si le mot clé existe déjà -> redirection 
            console.log('mot clé existe déjà en base de donnée');
            return res.view('templates/motsCles.ejs', { error: 'Le mot clé existe déjà en base de données.' });
        }
    }
}
// API pour afficher les évènements en fonction de la recherche
export const apiListeEvent = async (req, res) => {
    let { lieu, nom, motsCles } = req.params;
    const statut_id = req.params.actif;
    const user_id = req.params.userId;
    const actif = req.params.actif;
    if(motsCles){   
    // Si motsCles est une chaîne de caractères, convertissez-la en tableau
    if (typeof motsCles === 'string') {
            motsCles = motsCles.split(',').map(Number);
        }
    }
    let requete = `
        SELECT evenement.*, l.nom_ville, l.adresse, l.latitude, l.longitude 
        FROM evenement 
        INNER JOIN lieu l ON l.id = evenement.lieu_id`;
    let params = [statut_id];

    if (motsCles && motsCles.length > 0) {
        requete += `
            INNER JOIN evenement_mots_cles emc ON emc.evenement_id = evenement.id`;
    }

    // Condition du statut de l'événement
    if (actif === "1") {
        requete += " WHERE (evenement.statut_id = ? OR evenement.statut_id = 5)";
    } else {
        requete += " WHERE evenement.statut_id = ?";
    }

    // Filtrage par mots-clés
    if (motsCles && motsCles.length > 0) {
        requete += ` AND emc.mot_cle_id IN (${motsCles.map(() => '?').join(', ')})`;
        params.push(...motsCles);
    }

    // Filtrage par nom
    if (nom) {
        requete += " AND evenement.titre LIKE ?";
        params.push(`%${nom}%`);
    }

    // Filtrage par lieu
    if (lieu) {
        requete += " AND l.nom_ville LIKE ?";
        params.push(`%${lieu}%`);
    }

    // Filtrage par organisateur (user_id)
    if (user_id != 0) {
        requete += " AND evenement.organisateur_id = ?";
        params.push(user_id);
    }

    // Assurez-vous que tous les mots-clés sont présents
    if (motsCles && motsCles.length > 0) {
        requete += ` GROUP BY evenement.id HAVING COUNT(DISTINCT emc.mot_cle_id) = ?`;
        params.push(motsCles.length);
    }

    // Ajout de l'ordre par date de début
    if (actif === "1") {
        requete += " ORDER BY date_debut_evenement ASC";
    } else if (actif === "2") {
        requete += " ORDER BY date_debut_evenement DESC";
    }
    console.log('requete : ' + requete)
    console.log('params : ' + params)
    try {
        const [evenementsSansDates] = await connection.promise().query(requete, params);
        const evenements = await Promise.all(evenementsSansDates.map(async evenement => {
            return {
                ...evenement,
                date_final_inscription: formatDate(evenement.date_final_inscription),
                date_debut_evenement: formatDate(evenement.date_debut_evenement),
                date_fin_evenement: formatDate(evenement.date_fin_evenement),
            };
        }));
        res.send(evenements);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Erreur lors de la recherche des événements' });
    }
};

// Page d'accueil pour mettre à jour tous les évènements à chaque fois
const updateEventStatut = async (events) => {
        for (const event of events) {
            await verifyDateEvent(event);
        }
}
// Fonction pour mettre à jour le statut d'un évènement
export const verifyDateEvent = async (event) => {
    const now = new Date();
    let enCours = "Valide"
    const dateFinEvent = event.date_fin_evenement
    const dateDebutEvent = event.date_debut_evenement
    if (now < dateFinEvent && now > dateDebutEvent) {
        enCours = "Actuel"
        await connection.promise().query(`
    UPDATE evenement SET statut_id= 5 WHERE id= ? `, [event.id])
    }
    if (now > dateFinEvent) {
        await connection.promise().query(`
        UPDATE evenement SET statut_id= 2 WHERE id= ? `, [event.id])
        enCours = "Terminé"
    }
    return enCours
}

