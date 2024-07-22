import connection from "../database.js";
import { nbNotifEvenement, nbNotifMessage } from "../discussion.js";

////////////////////////////////////////// PARTICIPATIONS //////////////////////////////////////

// Page affichant le calendrier
export const showParticipations = async (req, res) => {
    const user = req.session.get('user');
    let userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)
    if (!user) {
        return res.redirect('/login');
    }

    return res.view('templates/participations.ejs', {
        user: req.session.get('user'),
        nbNotifMessageNonLus: nbNotifMessageNonLus,
        nbNotifEventNonLus: nbNotifEventNonLus
    })
}


