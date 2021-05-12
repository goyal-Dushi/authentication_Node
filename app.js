// jshint esversion: 6
require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const PORT = 3000;
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));

mongoose.connect("mongodb://localhost:27017/secretUserDB", { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

const userSchema = new mongoose.Schema({
    email : {
        type: String,
        required : true
    },
    password: {
        required : true,
        type: String
    }
});

userSchema.plugin(encrypt, 
    {secret : process.env.SECRET, 
    encryptedFields : ["password"]
});

const SecretUser = new mongoose.model('user',userSchema);


app.get('/', (req,res) => {
    res.render("home");
});

app.get('/logout', (req,res) => {
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
    const uname = req.body.username;
    const pwd = req.body.password;

    SecretUser.findOne({email : uname}, (err, data) => {
        if(err){
            console.log("Error :"+err);
        }else{
            if(data){
                if(data.password === pwd){
                    res.render('secrets');
                }
            }
        }
    })
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
    const newUser = new SecretUser({
        email : req.body.username,
        password : req.body.password
    })

    newUser.save((err) => {
        if(err){
            console.log("Error : "+err);
        }else{
            res.render('secrets');
        }
    })
});




app.listen(PORT, () => {
    console.log("Server started at : "+PORT);
})