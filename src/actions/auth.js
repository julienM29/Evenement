import connection from "../database.js";
import argon2 from "argon2";

// Page de création d'un compte
export const createAccount = async (req,res) => {
    if(req.method === 'GET'){
        return res.view('templates/register.ejs')
    }
    if(req.method === 'POST'){
        try {
            const { nom, prenom, email, password, photo } = req.body; // destructuration , récupération des données automatiquement 
            const hashPasswordUser = await argon2.hash(password) // Hashage du mot de passe en passant par argon2
            await connection.promise().query('INSERT INTO user (nom, prenom, password, email, photo,notification) VALUES (?, ?, ?, ?, ?, ?)', [nom, prenom, hashPasswordUser, email, photo, false]);
            console.log('Utilisateur créé avec succès');
            res.redirect('/'); // Redirigez l'utilisateur après la création du compte
        } catch (err) {
            console.error('Erreur lors de la création du post :', err);
            return res.status(500).send('Erreur interne du serveur');
        }
    }
}
// Fonction de connexion 
export const loginAction = async (req,res)=>{
    if(req.method === 'POST'){
        const email = req.body.email
        const motDePasse = req.body.password
        const [user] = await connection.promise().query('SELECT * FROM user WHERE email = ?', [email]);
        if (await argon2.verify(user[0].password, motDePasse)) { // Vérification du mot de passe avec le hashage grâce à argon2
            req.session.set('user',{
                id: user[0].id,
                nom: user[0].nom,
                prenom: user[0].prenom
            })
            return res.redirect('/')
        }
    } else {
        return res.view('templates/login.ejs')
    }
}
// Fonction de déconnexion
export const logoutAction = (req,res)=>{
    req.session.delete() // On efface le cookie avec les infos user
    return res.redirect('/login')
}