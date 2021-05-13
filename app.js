// jshint esversion: 6
require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const PORT = 3000;
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcryptjs');
// const SALT_ROUNDS = 10;

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(session({
    secret: "hellotherehowdoyoudo",
    resave : false,
    saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/secretUserDB", { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

const userSchema = new mongoose.Schema({
    username : {
        type: String,
        required : true
    },
    password : {
        type: String
    }
});

// hash and salt password in mongodb
userSchema.plugin(passportLocalMongoose);

// userSchema.plugin(encrypt, 
//     {secret : process.env.SECRET, 
//     encryptedFields : ["password"]
// });

const SecretUser = new mongoose.model('user',userSchema);

passport.use(SecretUser.createStrategy());

// assigns the cookie when session begins
passport.serializeUser((SecretUser, done) => {
    done(null, SecretUser);
});

// removes the cookie when session ends
passport.deserializeUser((SecretUser, done) => {
    done(null, SecretUser);
});


app.get('/', (req,res) => {
    res.render("home");
});

app.get('/logout', (req,res) => {
    req.logout();
    res.redirect('/');
});

/*
=====
LOGIN
=====
*/

app.route('/login')
.get((req,res) => {
    res.render("login");
})
.post((req,res) => {
    const user = new SecretUser({
        uname : req.body.username,
        pwd : req.body.password
    });

    req.login(user, (err) => {
        if(err){
            console.log("Error: "+err);
        }else{
            passport.authenticate("local")(req,res,() => {
                res.redirect('/secrets');
            })
        }
    })
})
// .post((req,res) => {
//     const uname = req.body.username;
//     const pwd = req.body.password;

//     SecretUser.findOne({email : uname}, (err, data) => {
//         if(err){
//             console.log("Error :"+err);
//         }else{
//             if(data){
//                 bcrypt.compare(pwd, data.password,(err, result) => {
//                     if(err){
//                         console.log("Error : "+err);
//                     }
//                     if(result){
//                         res.render('secrets');
//                     }
//                 })
//             }
//         }
//     })
// });


/*
=======
SECRETS
=======
*/

app.get("/secrets", (req,res) => {
    // after registering or if user has logged in , only 
    // then render the secrets page
    if(req.isAuthenticated()){
        res.render('secrets');
    }else{
        res.redirect('/login');
    }
});




/*
========
REGISTER
========
*/ 

app.route('/register')
.get((req,res) => {
    res.render("register");
})
.post((req,res) => {
    SecretUser.register({username: req.body.username}, req.body.password, (err, data) => {
        if(err){
            console.log("Error : "+err);
            res.redirect("register");
        }else{
            passport.authenticate("local") (req,res,() => {
                res.redirect("/secrets");
            })
        }
    })
});
// .post((req,res) => {

//     bcrypt.hash(req.body.password, SALT_ROUNDS, (err, hash) => {
            
//         const newUser = new SecretUser({
//                 email : req.body.username,
//                 password : hash 
//             })
    
//         newUser.save((err) => {
//                 if(err){
//                     console.log("Error : "+err);
//                 }else{
//                     res.render('secrets');
//                 }
//             })
//         })
// });

app.listen(PORT, () => {
    console.log("Server started at : "+PORT);
})