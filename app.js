
const express = require("express");
const app = express();
const { User, Sport, Session } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var csrf = require("tiny-csrf");
const path = require("path");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");

const saltRounds = 10;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELTE"]));
app.use(flash());

app.set("views", path.join(__dirname, "views"));

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "some-random-key4647847684654564",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch((error) => {
          console.log(error);
          return done(null, false, { message: "Invalid Mail" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((User) => {
      done(null, User);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});


app.get("/", async (request, response) => {
  if (request.user) {
    return response.redirect("/sports");
  } else {
    response.render("index", {
      title: "Sports Scheduler",
      csrfToken: request.csrfToken(),
    });
  }
});

app.get("/login", async (request, response) => {
  response.render("login", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    console.log(request.user.role);
    response.redirect("/sport");
  }
);

app.post('/users', async function (request, response) {
  //post request for signup form
   if (request.body.email.length === 0) {
    request.flash("error", "Email can't be empty!");
    return response.redirect("/signup");
  }
  if (request.body.firstName.length === 0) {
    request.flash("error", "Name cant be empty");
    return response.redirect("/signup");
  }
  if (request.body.password.length < 8) {
    request.flash("error", "Password must contain minimum of 8 characters");
    return response.redirect("/signup");
  }
   const submitValue = request.body.submit;
  const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPassword);
  console.log(request.body);
  try {
    if (submitValue === "admin") {
      const admin = await User.create({
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        password: hashedPassword,
        role: "admin",
      });
      request.login(admin, (err) => {
        if (err) {
          console.log(err);
        }
        response.redirect("/sport");
      });
    } else if (submitValue === "player") {
      const player = await User.create({
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        password: hashedPassword,
        role: "player",
      });
      request.login(player, (err) => {
        if (err) {
          console.log(err);
        }
        response.redirect("/sport");
      });
    } else {
      console.log("Invalid submit button");
    }
  } catch (error) {
    request.flash("error", "This mail already existes,try using a new mail");
    console.log(error);
    return response.redirect("/signup");
  }
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});
app.get("/sport", connectEnsureLogin.ensureLoggedIn() , async (request, response) => {
  try {
    const sports = await Sport.findAll();
    const user = request.user.firstName
    const role = request.user.role
    console.log("firstName========",user)
    console.log("role====",role)
    response.render("sports", { sports,user,role, csrfToken: request.csrfToken()}); // Pass sessions data to the template
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post("/sport", async (request,response)=>{
  try{
    const sportname = request.body.name;
    const sport = await Sport.create({sportname});
    return response.redirect("/sport")
  }
  catch(error){
    console.log(error);
  }
})

app.delete("/signout", function (req, res, next) {
  // need to implement signout behaviour here
});

app.get("/signout", function (request, response, next) {
  request.logout(function (err) {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.get("/sportsession/:id",connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const sportId = request.params.id;
    const userId = request.user.id;
    console.log(sportId);
    const sessions = await Session.findAll({ where: { sportId } });
    const ownsessions = await Session.findAll({ where: { sportId,userId } });
    console.log("sessions============",sessions)
    console.log("ownsessions============",ownsessions)
    response.render("session", { sessions,sportId,ownsessions, csrfToken: request.csrfToken() }); // Pass sessions data to the template
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/session', async function (request, response) {
  try {
    const sessions = await Session.findAll();
    return response.json(sessions);
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/session/:id', async function (request, response) {
  try {
    const { id } = request.params;
    const session = await Session.findByPk(id);
    if (!session) {
      return response.status(404).json({ message: 'Session not found' });
    }
    return response.json(session);
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/session', async function (request, response) {
  try {
    const time = request.body.time;
    const venue = request.body.venue;
    const participants = Array.isArray(request.body.participants.split(',')) ? request.body.participants.split(',') : [request.body.participants.split(',')];
    const playerNeeded = request.body.playerneeded;
    const sportId = request.body.sportId
    const userId = request.user.id
    console.log('Received form data:', request.body);
    const session = await Session.create({ time, venue, participants, playerNeeded,sportId,userId });
    return response.redirect("/sportsession/" + sportId);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete('/session/:id', async function (request, response) {
  try {
    const { id } = request.params;

    const session = await Session.findByPk(id);
    if (!session) {
      return response.status(404).json({ message: 'Session not found' });
    }

    await session.destroy();
    return response.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
});

app.put('/session/:id', async function (request, response) {
  try {
    const { id } = request.params;
    const { time, venue, participants, playerNeeded } = request.body;

    const session = await Session.findByPk(id);
    if (!session) {
      return response.status(404).json({ message: 'Session not found' });
    }

    session.time = time;
    session.venue = venue;
    session.participants = participants;
    session.playerNeeded = playerNeeded;

    await session.save();
    return response.json(session);
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
});
app.post('/session/:id/addParticipants', async function (request, response) {
  try {
    const { id } = request.params;
    const participants = "sanket"; // Assuming "sanket" is a valid participant value
    const additional = request.user.firstName;

    const session = await Session.findByPk(id);
    console.log("session==========",session)
    console.log("playerNeeded==========",session.dataValues.playerNeeded)
    var limit = session.dataValues.playerNeeded
    if (!session) {
      return response.status(404).json({ message: 'Session not found' });
    }
    if (limit > 0) {
  if (session.participants.includes(additional)) {
    console.log("hi, we are inside of if statement of session.participants.includes(additional)")
    request.flash("error", "you already entered !!");
    return response.redirect("/sportsession/"+session.dataValues.sportId);
  }else{
    session.participants = session.participants.concat(additional);
    limit = limit - 1;
  }
}

    try {
      await session.save();
      return response.json({ message: 'Participants added successfully' });
    } catch (error) {
      console.log(error);
      return response.status(500).json({ message: 'Error saving session' });
    }
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
});

app.put('/session/:id/removeParticipants', async function (request, response) {
  try {
    const { id } = request.params;
    const participantTobeRemove = "sanket"; // Assuming "sanket" is the participant to be removed
    const participantToRemove = request.user.firstName;
    const session = await Session.findByPk(id);
    if (!session) {
      return response.status(404).json({ message: 'Session not found' });
    }

    const participants = session.participants;
    const index = participants.indexOf(participantToRemove);

    if (index === -1) {
      return response.status(400).json({ message: 'Participant not found in session' });
    }

    participants.splice(index, 1);
    session.participants = participants;

    try {
      await session.save();
      return response.json({ message: 'Participant removed successfully' });
    } catch (error) {
      console.log(error);
      return response.status(500).json({ message: 'Error saving session' });
    }
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
});




module.exports = app;