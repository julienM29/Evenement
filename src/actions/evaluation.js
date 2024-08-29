import connection from "../database.js"
import { nbNotifEvenement, nbNotifMessage } from "../discussion.js"
import { formatDate } from "./evenement.js"

// Page affichant les évaluations d'un de tes évènements
export const showEvaluations = async (req, res) => {
    const user = req.session.get('user')
    const eventId = req.params.id
    const userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)

    const[participation] = await connection.promise().query(`
        SELECT count(*) as count
        FROM evenement.participation
        where user_id = ? and evenement_id  = ?;
        `,[userId,eventId])
    const countParticipation = participation[0].count
    let evaluation = null
        const [result] = await connection.promise().query(
            `SELECT * FROM evaluation
        WHERE evenement_id =? AND user_id =?`, [eventId, userId]
        );
        if (result.length > 0) {
            evaluation = result[0]
        }
        let evaluationLength = result.length
    if (req.method == 'GET') {
        
        const [evenement] = await connection.promise().query(
            `SELECT evenement.*, 
                 GROUP_CONCAT(mots_cles.nom SEPARATOR ',') AS motsCles,
                 user.prenom AS organisateurPrenom, user.nom AS organisateurNom,
                 l.nom_ville
                 FROM evenement 
                 INNER JOIN lieu l ON l.id = evenement.lieu_id
                 INNER JOIN evenement_mots_cles ON evenement.id = evenement_mots_cles.evenement_id 
                 INNER JOIN mots_cles ON mots_cles.id = evenement_mots_cles.mot_cle_id 
                 INNER JOIN user ON user.id = evenement.organisateur_id
                 WHERE evenement.id = ? `, [eventId]
        );

        let [evenementAvecDetail] = evenement.map(event => ({
            ...event,
            dateDebutEvenement: formatDate(event.date_debut_evenement),
            dateFinEvenement: formatDate(event.date_fin_evenement)
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
            dateEvaluation: formatDate(evaluation.date),
        }));
        const [moyenneEval] = await connection.promise().query(`
            SELECT AVG(e.evaluation) AS moyenne
            FROM evaluation e
            WHERE e.evenement_id = ?
            `, [eventId])
        let moyenne = 0
        if (moyenneEval[0].moyenne === null) {
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
            user: user,
            nbNotifMessageNonLus: nbNotifMessageNonLus,
            nbNotifEventNonLus: nbNotifEventNonLus,
            evenement: evenementAvecDetail,
            moyenne: moyenne,
            nbEvalByNote: nbEvalByNote,
            evaluation: evaluation,
            countParticipation: countParticipation,
            evaluations: evaluationsDateFormatted
        })
    }
    if (req.method == 'POST') {
        console.log('post')
        const commentaire = req.body.commentaire
        const evaluation = req.body.evaluation
        const now = new Date();
        const nowFormatted = formatDate(now)
        if (result.length !== 0) {
            console.log('update eval')
            await connection.promise().query(
                'UPDATE evaluation SET evaluation = ?, commentaire = ?, date = ?  WHERE id = ?',
                [evaluation, commentaire, nowFormatted.dateBDD, result[0].id]
            );
            console.log('update event notif')
            console.log(nowFormatted.dateBDD)
            console.log(result[0].id)
            await connection.promise().query(
                'UPDATE evenement.notification_evaluation SET is_read = 0, created_at = ? WHERE evaluation_id = ?',
                [nowFormatted.dateBDD,result[0].id]
            );
            console.log('après update event notif')
        } else {
            const [newEvaluation] = await connection.promise().query(
                'INSERT INTO evaluation (evenement_id, user_id, evaluation, commentaire, date) VALUES (?,?,?,?,?)',
                [eventId, userId, evaluation, commentaire, nowFormatted.dateBDD]
            );
            let reference = newEvaluation.insertId
            await connection.promise().query(
                'INSERT INTO evenement.notification_evaluation (user_id, evaluation_id, created_at, is_read) VALUES (?,?,?,?)',
                [userId, reference, nowFormatted.dateBDD,0]
            );
        }


        res.redirect(`/evaluations/evenement/${eventId}`)
    }

}