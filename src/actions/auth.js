import connection from "../database.js";
import argon2 from "argon2";

export const createAccount = async (req,res) => {
    console.log('debut create')
    if(req.method === 'GET'){
        return res.view('templates/register.ejs')
    }
    if(req.method === 'POST'){
        try {
            const { nom, prenom, email, password, photo } = req.body; // destructuration , récupération des données automatiquement 
            const hashPasswordUser = await argon2.hash(password)
            await connection.promise().query('INSERT INTO user (nom, prenom, password, email, photo,notification) VALUES (?, ?, ?, ?, ?, ?)', [nom, prenom, hashPasswordUser, email, photo, false]);
            console.log('Utilisateur créé avec succès');
            res.redirect('/'); // Redirigez l'utilisateur après la création du compte
        } catch (err) {
            console.error('Erreur lors de la création du post :', err);
            return res.status(500).send('Erreur interne du serveur');
        }
    }
}
export const test = (req, res) => {
    console.log('test')
}
export const loginAction = async (req,res)=>{
    if(req.method === 'POST'){
        const email = req.body.email
        const motDePasse = req.body.password
        const [user] = await connection.promise().query('SELECT * FROM user WHERE email = ?', [email]);
        if (await argon2.verify(user[0].password, motDePasse)) {
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
export const logoutAction = (req,res)=>{
    req.session.delete()
    return res.redirect('/login')
}