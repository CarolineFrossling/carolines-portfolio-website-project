const express = require("express");
const expressHandlebars = require("express-handlebars");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("carolines-portfolio-database.db");
const expressSession = require("express-session");
const bcryptjs = require("bcryptjs");
const app = express();
const projectTitleMaxLength = 150;
const guestbookNameMaxLength = 100;
const faqQuestionMaxLength = 500;
const correctUsername = "Caroline";
const correctPassword =
  "$2a$08$mXEqQD9Lq3TfhWmodtQ8mOT/zL08P450uDaSV6Di1XUd8A4HXza96";

db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    date TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY,
    question TEXT,
    answer TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS guestbooks (
    id INTEGER PRIMARY KEY,
    name TEXT,
    comment TEXT,
    date TEXT,
    answer TEXT
  )
`);

app.use(
  expressSession({
    secret: "fiawnkldswolidrte",
    saveUninitialized: false,
    resave: false,
  })
);

function getErrorMessagesForIsLoggedIn(request) {
  const errorMessages = [];

  if (!request.session.isLoggedIn) {
    errorMessages.push("You have to log in.");
  }
  return errorMessages;
}

function getServerErrorMessageForResource(error) {
  const serverError = [];

  if (error) {
    serverError.push("Internal server error.");
  }
  return serverError;
}

function getErrorMessagesForAnswer(request, answer) {
  const errorMessages = [];

  if (!request.session.isLoggedIn) {
    errorMessages.push("You have to log in.");
  }

  if (answer == "") {
    errorMessages.push("No answer was written.");
  }
  return errorMessages;
}

app.engine(
  "hbs",
  expressHandlebars.engine({
    defaultLayout: "main.hbs",
  })
);

app.use(express.static("public"));

app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use(function (request, response, next) {
  const isLoggedIn = request.session.isLoggedIn;

  response.locals.isLoggedIn = isLoggedIn;

  next();
});

app.get("/", function (request, response) {
  const query = `SELECT * FROM guestbooks`;

  db.all(query, function (error, guestbooks) {
    const serverError = getServerErrorMessageForResource(error);
    const model = {
      serverError,
      guestbooks,
    };
    response.render("home.hbs", model);
  });
});

app.get("/about", function (request, response) {
  const query = `SELECT * FROM faqs`;

  db.all(query, function (error, faqs) {
    const serverError = getServerErrorMessageForResource(error);
    const model = {
      serverError,
      faqs,
    };
    response.render("about.hbs", model);
  });
});

app.get("/contact", function (request, response) {
  response.render("contact.hbs");
});

app.get("/projects", function (request, response) {
  const query = `SELECT * FROM projects`;

  db.all(query, function (error, projects) {
    const serverError = getServerErrorMessageForResource(error);
    const model = {
      serverError,
      projects,
    };
    response.render("projects.hbs", model);
  });
});

app.get("/projects/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM projects WHERE id = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    const serverError = getServerErrorMessageForResource(error);
    const model = {
      serverError,
      project,
    };
    response.render("specific-project.hbs", model);
  });
});

app.get("/login", function (request, response) {
  response.render("login.hbs");
});

app.get("/create-project", function (request, response) {
  if (request.session.isLoggedIn) {
    response.render("create-project.hbs");
  } else {
    response.redirect("/login");
  }
});

app.get("/update-project/:id", function (request, response) {
  const id = request.params.id;
  const query = `SELECT * FROM projects WHERE id = ?`;
  const values = [id];

  if (request.session.isLoggedIn) {
    db.get(query, values, function (error, project) {
      const serverError = getServerErrorMessageForResource(error);
      const model = {
        serverError,
        project,
      };
      response.render("update-project.hbs", model);
    });
  } else {
    response.redirect("/login");
  }
});

app.get("/update-guestbook/:id", function (request, response) {
  const id = request.params.id;
  const query = `SELECT * FROM guestbooks WHERE id = ?`;
  const values = [id];

  if (request.session.isLoggedIn) {
    db.get(query, values, function (error, guestbook) {
      const serverError = getServerErrorMessageForResource(error);
      const model = {
        serverError,
        guestbook,
      };
      response.render("update-guestbook.hbs", model);
    });
  } else {
    response.redirect("/login");
  }
});

app.get("/update-faq/:id", function (request, response) {
  const id = request.params.id;
  const query = `SELECT * FROM faqs WHERE id = ?`;
  const values = [id];

  if (request.session.isLoggedIn) {
    db.get(query, values, function (error, faq) {
      const serverError = getServerErrorMessageForResource(error);
      const model = {
        serverError,
        faq,
      };
      response.render("update-faq.hbs", model);
    });
  } else {
    response.redirect("/login");
  }
});

app.post("/create-project", function (request, response) {
  const title = request.body.title;
  const description = request.body.description;
  const errorMessages = getErrorMessagesForIsLoggedIn(request);

  if (title.length > projectTitleMaxLength) {
    errorMessages.push(
      "The title cannot contain more than " +
        projectTitleMaxLength +
        " characters."
    );
  } else if (title == "") {
    errorMessages.push("The project must be given a title.");
  }

  if (description == "") {
    errorMessages.push("The project must be given a description.");
  }

  if (errorMessages.length == 0) {
    const query = `
    INSERT INTO projects (title, description, date) VALUES (?, ?, date('now'))
  `;
    const values = [title, description];

    db.run(query, values, function (error) {
      response.redirect("/projects");
    });
  } else {
    const model = {
      errorMessages,
      title,
      description,
    };
    response.render("create-project.hbs", model);
  }
});

app.post("/update-project/:id", function (request, response) {
  const id = request.params.id;
  const newTitle = request.body.title;
  const newDescription = request.body.description;
  const errorMessages = getErrorMessagesForIsLoggedIn(request);

  if (newTitle.length == 0 && newDescription.length == 0) {
    errorMessages.push("No changes were made.");
  } else if (newTitle.length > projectTitleMaxLength) {
    errorMessages.push(
      "The title cannot contain more than " +
        projectTitleMaxLength +
        " characters."
    );
  }

  if (errorMessages.length == 0) {
    let query = ``;
    let values = [];

    if (newTitle.length > 0 && newDescription.length > 0) {
      query = `UPDATE projects SET title = ?, description = ? WHERE id = ?`;
      values = [newTitle, newDescription, id];
    } else if (newTitle.length > 0) {
      query = `UPDATE projects SET title = ? WHERE id = ?`;
      values = [newTitle, id];
    } else if (newDescription.length > 0) {
      query = `UPDATE projects SET description = ? WHERE id = ?`;
      values = [newDescription, id];
    }

    db.run(query, values, function (error) {
      response.redirect("/projects");
    });
  } else {
    const model = {
      errorMessages,
      title: newTitle,
      description: newDescription,
    };
    response.render("update-project.hbs", model);
  }
});

app.post("/delete-project/:id", function (request, response) {
  const id = request.params.id;
  const query = `DELETE FROM projects WHERE id = ?`;

  if (request.session.isLoggedIn) {
    db.run(query, id, function (error) {
      response.redirect("/projects");
    });
  } else {
    response.redirect("/login");
  }
});

app.post("/", function (request, response) {
  const name = request.body.name;
  const comment = request.body.comment;
  let query = ``;
  const errorMessages = [];

  if (comment == "") {
    errorMessages.push("No comment was written.");
  }

  if (name == "") {
    errorMessages.push("No name was written.");
  } else if (name.length > guestbookNameMaxLength) {
    errorMessages.push(
      "The name cannot contain more than " +
        guestbookNameMaxLength +
        " characters."
    );
  }

  if (errorMessages.length == 0) {
    query = `INSERT INTO guestbooks (name, comment, date, answer) VALUES (?, ?, date('now'), "Waiting for answer...")`;
    const values = [name, comment];

    db.run(query, values, function (error) {
      response.redirect("/");
    });
  } else {
    query = `SELECT * FROM guestbooks`;
    db.all(query, function (error, guestbooks) {
      const model = {
        errorMessages,
        name,
        comment,
        guestbooks,
      };
      response.render("home.hbs", model);
    });
  }
});

app.post("/update-guestbook/:id", function (request, response) {
  const id = request.params.id;
  const answer = request.body.answer;
  const errorMessages = getErrorMessagesForAnswer(request, answer);

  if (errorMessages.length == 0) {
    const query = `UPDATE guestbooks SET answer = ? WHERE id = ?`;
    const values = [answer, id];

    db.run(query, values, function (error) {
      response.redirect("/");
    });
  } else {
    const model = {
      id,
      answer,
      errorMessages,
    };
    response.render("update-guestbook.hbs", model);
  }
});

app.post("/delete-guestbook/:id", function (request, response) {
  const id = request.params.id;
  const query = `DELETE FROM guestbooks WHERE id = ?`;

  if (request.session.isLoggedIn) {
    db.run(query, id, function (error) {
      response.redirect("/");
    });
  } else {
    response.redirect("/login");
  }
});

app.post("/about", function (request, response) {
  const question = request.body.question;
  let query = ``;
  const errorMessages = [];

  if (question == "") {
    errorMessages.push("No question was written.");
  } else if (question.length > faqQuestionMaxLength) {
    errorMessages.push(
      "The question cannot contain more than " +
        faqQuestionMaxLength +
        " characters."
    );
  }

  if (errorMessages.length == 0) {
    query = `INSERT INTO faqs (question, answer) VALUES (?, "Waiting for answer...")`;
    const values = [question];

    db.run(query, values, function (error) {
      response.redirect("/about");
    });
  } else {
    query = `SELECT * FROM faqs`;
    db.all(query, function (error, faqs) {
      const model = {
        errorMessages,
        question,
        faqs,
      };
      response.render("about.hbs", model);
    });
  }
});

app.post("/update-faq/:id", function (request, response) {
  const id = request.params.id;
  const answer = request.body.answer;
  const errorMessages = getErrorMessagesForAnswer(request, answer);

  if (errorMessages.length == 0) {
    const query = `UPDATE faqs SET answer = ? WHERE id = ?`;
    const values = [answer, id];

    db.run(query, values, function (error) {
      response.redirect("/about");
    });
  } else {
    const model = {
      id,
      answer,
      errorMessages,
    };
    response.render("update-faq.hbs", model);
  }
});

app.post("/delete-faq/:id", function (request, response) {
  const id = request.params.id;
  const query = `DELETE FROM faqs WHERE id = ?`;

  if (request.session.isLoggedIn) {
    db.run(query, id, function (error) {
      response.redirect("/about");
    });
  } else {
    response.redirect("/login");
  }
});

app.post("/login", function (request, response) {
  const enteredUsername = request.body.username;
  const enteredPassword = request.body.password;
  const errorMessages = [];

  if (enteredUsername == "") {
    errorMessages.push("No username was entered.");
  } else if (enteredUsername != correctUsername) {
    errorMessages.push("The wrong username was entered.");
  }

  if (enteredPassword == "") {
    errorMessages.push("No password was entered.");
  } else if (enteredPassword != correctPassword) {
    errorMessages.push("The wrong password was entered.");
  }

  if (enteredUsername == correctUsername) {
    bcryptjs.compare(
      enteredPassword,
      correctPassword,
      function (error, result) {
        if (result) {
          request.session.isLoggedIn = true;
          response.redirect("/");
        } else {
          const model = {
            errorMessages,
          };
          response.render("login.hbs", model);
        }
      }
    );
  } else {
    const model = {
      errorMessages,
    };
    response.render("login.hbs", model);
  }
});

app.post("/logout", function (request, response) {
  request.session.isLoggedIn = false;
  response.redirect("/");
});

app.listen(8080);
