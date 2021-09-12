// jshint esversion: 6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const PORT = 3000;
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate"); // required for oauth passport!
const GoogleStrategy = require("passport-google-oauth20").Strategy;

require("passport-local").Strategy;

// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcryptjs');
// const SALT_ROUNDS = 10;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb://localhost:27017/secretUserDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  },
  () => {
    console.log("DB connected!");
  }
);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    // required: true,
  },
  password: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
  },
  about: {
    type: String,
  },
  googleId: {
    type: String,
  },
});

// hash and salt password in mongodb
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// mongoose encryption using a secret key
// userSchema.plugin(encrypt,
//     {secret : process.env.SECRET,
//     encryptedFields : ["password"]
// });

const SecretUser = new mongoose.model("user", userSchema);

passport.use(SecretUser.createStrategy());

// assigns the cookie when session begins
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// removes the cookie when session ends
passport.deserializeUser((id, done) => {
  SecretUser.findById(id, (err, user) => {
    done(null, id);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      // userProfileURL: "https//www.googleapis.com/oauth/v3/userinfo",
      // userProfileURL: "https://**www**.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log("Profile:", profile);
      console.log("Access Token: ", accessToken, " Refresh: ", refreshToken);
      SecretUser.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

/*
=====
LOGIN
=====
*/

app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res, next) => {
    const user = new SecretUser({
      username: req.body.username,
      password: req.body.password,
    });
    req.login(user, (err) => {
      console.log("IN req.login");
      if (err) {
        console.log("Error:no able to log in user:  " + err);
        console.log("req. in error login: ", req);
        res.redirect("/login");
      } else {
        passport.authenticate("local")(req, res, () => {
          if (req?.user) {
            res.redirect("/secrets");
          } else {
            console.log("Invalid username or pwd or register");
          }
        });
      }
    });
  });
// .post((req,res) => {
//     const uname = req.body.username;
//     const pwd = req.body.password;

// handling post request for bcrypt pwd's
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

app.get("/secrets", (req, res) => {
  // after registering or if user has logged in , only
  // then render the secrets page
  console.log("secrets req:session: ", req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

/*
========
REGISTER
========
*/

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    SecretUser.register(
      { username: req.body.username, ...req.body },
      req.body.password,
      (err, data) => {
        if (err) {
          console.log("Error : " + err);
          res.redirect("/register");
        } else {
          console.log("Registration data: ", data);
          passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
          });
        }
      }
    );
  });
// .post((req,res) => {

// generating hashed pwd with salting to make more secure than md5
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

// google auth
// after google auth, get the user profile having
// email, id of the user
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

// authorised redirect uri will be hit after authentication
// here:  http://localhost:3000/auth/google/secrets
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("redirection to secrets");
    res.redirect("/secrets");
  }
);

app.listen(PORT, () => {
  console.log("Server started at : " + PORT);
});
