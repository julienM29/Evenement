import connection from "../database.js"
import { nbNotifEvenement, nbNotifMessage } from "../discussion.js"
import { formatDate } from "./evenement.js"

// Page évaluation d'un évènement 
export const makeEvaluation = async (req,res)=>{
    const user = req.session.get('user')
    const eventId = req.params.id
    const userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)
    let evaluation = null
    const [result] = await connection.promise().query(
        `SELECT * FROM evaluation
        WHERE evenement_id =? AND user_id =?`,[eventId,userId]
    );
    if(result.length > 0){
        evaluation = result[0]
    } 
    let evaluationLength = result.length

    if (req.method === 'GET') { // Requete GET affichage de la page
        const [evenements] = await connection.promise().query(
            `SELECT evenement.*, 
                 GROUP_CONCAT(mots_cles.id SEPARATOR ',') AS motsCles,
                 user.prenom AS organisateurPrenom, user.nom AS organisateurNom
                 FROM evenement 
                 INNER JOIN evenement_mots_cles ON evenement.id = evenement_mots_cles.evenement_id 
                 INNER JOIN mots_cles ON mots_cles.id = evenement_mots_cles.mot_cle_id 
                 INNER JOIN user ON user.id = evenement.organisateur_id
                 WHERE evenement.id = ? 
                 GROUP BY evenement.id`, [eventId]
        );
        
        const evenementsAvecDetails = await Promise.all(evenements.map(async evenement => {
            const dateDebutEvenement = formatDate(evenement.date_debut_evenement);
            const dateFinEvenement = formatDate(evenement.date_fin_evenement);
            return { // On modifie les dates et les mots clés ainsi que l'organisateur pour ne pas avoir un id mais des données
                ...evenement,
                date_debut_evenement: dateDebutEvenement,
                date_fin_evenement: dateFinEvenement,
            };
        }));
        const [search] = await connection.promise().query('SELECT * FROM participation WHERE evenement_id =? AND user_id =?', [eventId, userId])

        let participation = false // Permet d'afficher ou d'enlever le bouton de participation à l'évènement
        if (search.length > 0) {
            participation = true
        }
        return res.view('templates/evaluation.ejs', {
            evenement: evenementsAvecDetails[0],
            participation: participation,
            evaluation: evaluation,
            evaluationLength: evaluationLength,
            nbNotifMessageNonLus: nbNotifMessageNonLus,
            nbNotifEventNonLus: nbNotifEventNonLus,
            user: user
        })
    }
    if(req.method === 'POST'){
        const commentaire = req.body.commentaire
        const evaluation = req.body.evaluation
        const now = new Date();
        const nowFormatted = formatDate(now)
        if(result.length !== 0){
            await connection.promise().query(
                'UPDATE evaluation SET evaluation = ?, commentaire = ?, date = ?  WHERE id = ?',
                [ evaluation,  commentaire, nowFormatted.dateBDD, result[0].id]
            );
            await connection.promise().query(
                'UPDATE notification_evenement SET is_read = 0 WHERE id = ?',
                [result[0].id]
            ); 
        } else {
            const [newEvaluation] = await connection.promise().query(
                'INSERT INTO evaluation (evenement_id, user_id, evaluation, commentaire, date) VALUES (?,?,?,?,?)',
                [eventId, userId, evaluation,  commentaire, nowFormatted.dateBDD]
            );
            let reference = newEvaluation.insertId
            await connection.promise().query(
                'INSERT INTO notification_evenement (user_id, type, reference_id, created_at) VALUES (?,?,?,?)',
                [userId, 'evaluation',reference , nowFormatted.dateBDD]
            );
        }
        
        
        res.redirect('/')    }
}


// Page affichant les évaluations d'un de tes évènements
export const showEvaluations = async (req,res)=>{
    const user = req.session.get('user')
    const eventId = req.params.id
    const userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)
    if(req.method == 'GET'){
        const [evenement] = await connection.promise().query(
            `SELECT evenement.*, 
                 GROUP_CONCAT(mots_cles.nom SEPARATOR ',') AS motsCles,
                 user.prenom AS organisateurPrenom, user.nom AS organisateurNom
                 FROM evenement 
                 INNER JOIN evenement_mots_cles ON evenement.id = evenement_mots_cles.evenement_id 
                 INNER JOIN mots_cles ON mots_cles.id = evenement_mots_cles.mot_cle_id 
                 INNER JOIN user ON user.id = evenement.organisateur_id
                 WHERE evenement.id = ? `, [eventId]
        );
        
        let [evenementAvecDetail] = evenement.map(event => ({
            ...event,
            dateDebutEvenement : formatDate(event.date_debut_evenement),
            dateFinEvenement : formatDate(event.date_fin_evenement)
        }));
        const [evaluations] = await connection.promise().query(`
            SELECT  e.evaluation, e.commentaire,e.date, CONCAT(u.prenom, ' ', u.nom) AS identite, u.id as user_id
            FROM evaluation e
            inner join user u on  u.id = e.user_id
            where e.evenement_id = ?
             order by date DESC
            `, [eventId])
        const evaluationsDateFormatted = evaluations.map(evaluation => ({
            ...evaluation,
            dateEvaluation : formatDate(evaluation.date),
        }));
        const [moyenneEval] = await connection.promise().query(`
            SELECT AVG(e.evaluation) AS moyenne
            FROM evaluation e
            WHERE e.evenement_id = ?
            `, [eventId])
        let moyenne 
            if(moyenneEval.moyenne === null){
                moyenne = 0
            } else {
               moyenne = (parseFloat(moyenneEval[0].moyenne)).toFixed(2) 
            }
         
        const [nbEvalByNote] = await connection.promise().query(`
            SELECT e.evaluation, COUNT(*) AS count
            FROM evaluation e
            WHERE e.evenement_id = ?
            GROUP BY e.evaluation 
            `, [eventId])
        return res.view('templates/showEvaluations.ejs', {
                user:user,
                nbNotifMessageNonLus: nbNotifMessageNonLus,
                nbNotifEventNonLus: nbNotifEventNonLus,
                evenement: evenementAvecDetail,
                moyenne : moyenne,
                nbEvalByNote :nbEvalByNote,
                evaluations: evaluationsDateFormatted
            })
    }
    
}