import connection from "../database.js"

const formatDate = (dateString) => {
    const dateObj = new Date(dateString);
    const jour = dateObj.getDate().toString().padStart(2, '0');
    const mois = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const annee = dateObj.getFullYear();

    return `${annee}-${mois}-${jour}`;
};
const idKeyWords = async (id) => {
    const [mots_cles_id] = await connection.promise().query('SELECT mot_cle_id FROM evenement_mots_cles WHERE evenement_id = ?', [id]); // Récupère tout les id des mots clés de la table de jointure en fonction de l'id de l'évènement
    return mots_cles_id.map(row => row.mot_cle_id); // Permet de transformer le tableau d'objet en seulement un tableau contenant les id
}
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
                date_evenement: formatDate(evenement.date_evenement),
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
            date_evenement: formatDate(evenement.date_evenement),
            organisateur: utilisateursMap.get(evenement.organisateur_id),
        };
        return [evenementAvecDetails]; // Retourner un tableau contenant l'événement avec détails
    }

    return []; // Si Events est vide ou non défini, retourner un tableau vide ou gérer en conséquence
};


export const listeEvent = async (req, res) => {
    try {
        // Récupérer tous les événements
        const [evenements] = await connection.promise().query('SELECT * FROM evenement');
        const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');

        // Appeler la fonction pour obtenir les détails des événements
        const evenementsAvecDetails = await makeEventTab(evenements, motsCles);
        console.log(evenementsAvecDetails)

        return res.view('/templates/index.ejs', {
            evenements: evenementsAvecDetails || [], // Assurez-vous de gérer le cas où evenementsAvecDetails est undefined
            user: req.session.get('user')
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des événements :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}

export const showEvent = async (req, res) => {
    const eventId = req.params.id
    const [evenement] = await connection.promise().query('SELECT * FROM evenement WHERE id =?', [eventId])
    const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');
    const evenementsAvecDetails = await makeEventTab(evenement, motsCles)
    console.log(evenementsAvecDetails)
    return res.view('templates/showEvenement.ejs', {
        evenement: evenementsAvecDetails[0],
        motsCles: motsCles,
        user: req.session.get('user')
    })
}
export const modifierEvenement = async (req, res) => {
    const eventId = req.params.id
    if(req.method === 'GET'){
    const [evenement] = await connection.promise().query('SELECT * FROM evenement WHERE id =?', [eventId])
    const [motsCles] = await connection.promise().query('SELECT id, nom FROM mots_cles');
    const evenementsAvecDetails = await makeEventTab(evenement, motsCles)
    console.log(evenementsAvecDetails)
    return res.view('templates/modifierEvenement.ejs', {
        evenement: evenementsAvecDetails[0],
        motsCles: motsCles,
        user: req.session.get('user')
    })
    }
    if(req.method === 'POST'){
        const { titre, lieu, description, dateFinal, dateEvenement } = req.body;

        await connection.promise().query('UPDATE evenement SET titre = ?, lieu = ?, description = ?, date_final_inscription = ?, date_evenement = ? WHERE id = ?', [titre, lieu, description, dateFinal, dateEvenement,eventId])
        console.log('l évènement a été modifié')
        res.redirect('/')
    }
}
export const showProfil = async (req, res) => {
    const postId = req.params.id;

    const [results] = await connection.promise().query('SELECT * FROM user WHERE id =? ', [postId]);
    const user = results[0]
    return res.view('templates/profil.ejs', {
        user: user
    })
}
export const createEvent = async (req, res) => {
    if (req.method === 'GET') {
        const [motsCles] = await connection.promise().query('SELECT * FROM mots_cles')
        return res.view('templates/creation.ejs', {
            user: req.session.get('user'),
            motsCles: motsCles
        })
    }
    if (req.method === 'POST') {
        try {
            const user = req.session.get('user');
            if (user) {
                const userId = user.id;
                const { titre, lieu, description, dateFinal, dateEvenement } = req.body;
                const motsCles = req.body["motsCles[]"]
                // Insertion de l'événement dans la table evenement
                const [event] = await connection.promise().query(
                    'INSERT INTO evenement (titre, lieu, description, date_final_inscription, date_evenement, organisateur_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [titre, lieu, description, dateFinal, dateEvenement, userId]
                );

                // Récupération de l'ID de l'événement créé
                const evenementId = event.insertId;
                console.log('Evenement créé avec succès. ID:', evenementId);

                // Insertion des relations dans la table evenement_mots_cles
                for (const motCleId of motsCles) {
                    await connection.promise().query(
                        'INSERT INTO evenement_mots_cles (evenement_id, mot_cle_id) VALUES (?, ?)',
                        [evenementId, motCleId]
                    );
                }

                // Redirection vers la page d'accueil après création de l'événement
                return res.redirect('/');
            } else {
                return res.status(401).send('Utilisateur non authentifié');
            }
        } catch (err) {
            console.error('Erreur lors de la création de l\'événement :', err);
            return res.status(500).send('Erreur interne du serveur');
        }
    }
}

export const createKeyWords = async (req, res) => {
    if (req.method === 'GET') {
        return res.view('templates/motsCles.ejs', { error: null });
    }
    if (req.method === 'POST') {
        const nom = req.body.nom
        const [result] = await connection.promise().query('SELECT * FROM mots_cles WHERE nom =? ', [nom]);
        if (result.length === 0) {
            await connection.promise().query('INSERT INTO mots_cles (nom) VALUES (?)', [nom]);
            console.log('mot clé créé avec succès');
            res.redirect('/motsCles'); // Redirigez l'utilisateur après la création du compte
        } else {
            console.log('mot clé existe déjà en base de donnée');

            return res.view('templates/motsCles.ejs', { error: 'Le mot clé existe déjà en base de données.' });
        }

    }
}