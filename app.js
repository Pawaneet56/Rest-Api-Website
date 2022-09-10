//var app=angular.module('myApp',[]);
//it is connecting to database
var mysql = require("mysql");
//it is used for routing 
const express = require("express");
//it is used for joining the paths
var path = require("path");

var bodyParser = require('body-parser');
const session = require('express-session');
//data from excel sheet will be transferred using exceldata
var exceldata = require('./filereader');

const url = require('url');

var app = express();

//mysql connection 
var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "students_records",
    multipleStatements: true
});

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// starting page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './main.html'));
})

// Register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, './register.html'));
})

//Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, './login.html'));
});

//used to collect data from the employee
app.get('/info', (req, res) => {
    res.sendFile(path.join(__dirname, './index.html'));
})

//listening the app on this port
app.listen(3009, function (err) {
    if (typeof (err) == "undefined") {
        console.log('Your application is running on : ' + 3009 + ' port');
    }
});

//registering the fields
app.post('/authregister', (req, res) => {
    var name = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var role = req.body.role;
    //sql  query to insert data into users table
    var sql = `INSERT INTO users(name,password,email,role) VALUES("${name}","${password}","${email}","${role}")`;
    connection.query(sql, (err, result) => {
        if (err) {
            // alert('Email already in use login to continue');
            res.redirect('/');
        }
        else {
            req.session.loggedin = true;
            req.session.username = name;
            req.session.password = password;
            req.session.email = email;
            req.session.role = role;
            //redirecting to info page 
            res.redirect('/info');
        }

    });


});


//checking the login details
app.post('/auth', function (req, res) {
    // Capture the input fields
    let email = req.body.email;
    let password = req.body.password;
    // Ensure the input fields exists and are not empty
    if (email && password) {
        // Execute SQL query that'll select the account from the database based on the specified username and password
        connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], function (error, results, fields) {
            // If there is an issue with the query, output the error
            if (error) throw error;
            // If the account exists
            if (results.length > 0) {
                // Authenticate the user
                req.session.loggedin = true;
                for (var i = 0; i < results.length; i++) {
                    //console.log(results[i]['name']);
                    req.session.username = results[i]['name'];
                    req.session.role = results[i]['role'];
                    req.session.email = results[i]['email'];
                }

                //   req.session.password = password;
                // Redirect to home page
                res.redirect('/home');
            } else {
                res.send('Incorrect email and/or Password!');
            }
            res.end();
        });
    } else {
        res.send('Please enter email and Password!');
        res.end();
    }
});


//adding  all the employee details
app.post('/add', function (req, res) {
    var name = req.session.username;
    var email = req.session.email;
    var doj = req.body.doj;
    var proj_name = req.body.proj_name;
    var part_name = req.body.part_name;
    var eligible = req.body.eligible;
    var status = req.body.status;
    //sql query to insert data into swc1 table
    var sql = `INSERT INTO swc1(name,email_id,DOJ,project_name,part_name,swc_eligible,swc_status) VALUES("${name}","${email}","${doj}","${proj_name}","${part_name}","${eligible}","${status}")`;
    connection.query(sql, (err, result) => {
        if (err) throw err;
        //redirecting to home page 
        res.redirect('/home');
    });

});
//home page data will be delivered according to the role of a person
app.get('/home', function (req, res) {
    // If the user is loggedin
    if (req.session.loggedin) {

        var name = req.session.username;
        var email = req.session.email;
        var role = req.session.role;

        req.session.name = name;
        req.session.loggedin = true;

        //will be redirected according to the role
        if (role == 'Trainer') res.redirect('/viewchart');
        if (role == 'Admin') res.redirect('/createtopic');

    } else {
        // Not logged in
        res.send('Please login to view this page!');
    }
    res.end();
});

//used for posting the training data
app.post('/createtraining', (req, res) => {
    var team = req.body.team;
    var group = req.body.group;
    var part = req.body.part;
    var project = req.body.project;
    var member = req.body.member;
    var subject = req.body.subject;
    var topic = req.body.topic;
    var startdate = req.body.startdate;
    var enddate = req.body.enddate;
    var trainer = req.body.trainer;
    // console.log(trainer);
    //if any field value is null then display error message 
    if (!team || !group || !project || !member || !part) {
        res.send("All fields are required");

    }
    //insert data into temporary table later will be inserted into original table
    var sql = `INSERT INTO temp_training(team,group1,part,project,member,subject,topic,startdate,enddate,trainer) 
    VALUES("${team}","${group}","${part}","${project}","${member}","${subject}","${topic}","${startdate}","${enddate}","${trainer}")`;
    connection.query(sql, (error, result) => {
        if (error) throw error;
        //redirecting to create training page
        res.redirect(url.format({
            pathname: '/createtraining',
            query: {
                "name": trainer,
                "loggedin": true
            }
        }
        ));


    })
})

//trainings will be shown here before adding them to the database
app.get('/createtraining', (req, res) => {
    let loggedin = req.query.loggedin;
    let name = req.query.name;

    if (loggedin) {
        //sql query to select training details
        connection.query("select id,subject,topic,DATE_FORMAT(startdate,'%d-%b-%Y') as startdate,DATE_FORMAT(enddate,'%d-%b-%Y') as enddate,case when datediff(startdate,enddate)<0 then 0 else datediff(startdate,enddate) end as overdue,current_status,status_verification from temp_training order by subject", (err, result) => {
            if (err) throw err;
            //rendering create training page with updated values
            res.render('./createtraining.ejs', { users: result, exceldata: exceldata, name: name });
        })
    }
    else {
        //if not logged in then you have to log in
        res.send("Please log in to view this page")
    }
    //res.sendFile(path.join(__dirname, './createtraining.html'));
})

//all the trainings will be pushed to database
app.post('/pushtraining', (req, res) => {
    //inserting temporary table data into permanent table and deleting from temporary table
    connection.query('insert into training select * from temp_training;delete from temp_training;', (err, result) => {
        if (err) throw err;
        res.redirect('/home');

    })
})

//All the trainings will be viewed here for the specific data 
app.get('/viewtraining', (req, res) => {
    if (req.query.loggedin) {
        var team = req.query.team;
        var group = req.query.group;
        var part = req.query.part;
        var project = req.query.project;
        var member = req.query.member;
        var name = req.query.trainer;
        //if any value is null then show the full data
        if (!team || !group || !part || !project || !member) {
            connection.query(`select id,subject,topic,DATE_FORMAT(startdate,'%d-%b-%Y') as startdate,DATE_FORMAT(enddate,'%d-%b-%Y') as
             enddate,case when datediff(startdate,enddate)<0 then 0 else datediff(startdate,enddate) end as overdue,current_status,status_verification 
             from training where trainer=? order by subject `, [name], (err, result) => {
                if (err) throw err;
                res.render('./viewtraining.ejs', { users: result, exceldata: exceldata, name: name });
            })

        }
        else {
            //show specific data according to value selected
            connection.query(`select id,subject,topic,DATE_FORMAT(startdate,'%d-%b-%Y') as startdate,DATE_FORMAT(enddate,'%d-%b-%Y') as 
            enddate,case when datediff(startdate,enddate)<0 then 0 else datediff(startdate,enddate) end as overdue,current_status,status_verification
             from training where team=? and group1=? and part=? and project=? and member=? and trainer=? order by subject`, [team, group, part, project, member, name], (err, result) => {
                if (err) throw err;
                res.render('./viewtraining.ejs', { users: result, exceldata: exceldata, name: name });
            })
        }
    }
    else {
        res.send('Please login to view this page');
    }

});

//you can delete the training before pushing them to the database
app.get('/deletetraining', (req, res) => {
    var id = req.query.id;
    var trainer = req.query.trainer;
    //deleting a particular training
    var sql = 'delete from temp_training where id=?';
    connection.query(sql, [id], (err, result) => {
        if (err) throw err;
        res.redirect(url.format({
            pathname: '/createtraining',
            query: {
                "name": trainer,
                "loggedin": true
            }
        }));
    })
})

//while viewing a training you can update it
app.get('/updatetraining', (req, res) => {
    var id = req.query.id;
    var trainer = req.query.trainer;
    //updating a training
    var sql = `select id,DATE_FORMAT(startdate,'%d-%b-%Y') as startdate,DATE_FORMAT(enddate,'%d-%b-%Y') as enddate,
    current_status,status_verification from training where id=?`;
    connection.query(sql, [id], (err, result) => {
        if (err) throw err;
        res.render('./updatetraining.ejs', { student: result, name: trainer });
    })
})

//Here the updates will be posted
app.post('/updatetraining', (req, res) => {
    var startdate = req.body.startdate;
    var enddate = req.body.enddate;
    var current_status = req.body.current_status;
    var status_verification = req.body.status_verification;
    var id = req.body.id;
    var trainer = req.body.trainer;
    //sql query to update data with all the above values
    var sql = 'update training set startdate=?,enddate=?,current_status=?,status_verification=? where id=?';
    connection.query(sql, [startdate, enddate, current_status, status_verification, id], (err, result) => {
        if (err) throw err;
        res.redirect(url.format({
            pathname: '/viewtraining',
            query: {
                "name": trainer,
                "loggedin": true
            }
        }));
    })
})


//The progress will be shown in this page
app.get('/viewchart', (req, res) => {
    if (req.session.loggedin) {
        var sql = 'select subject,avg(current_status) as current_status from training group by subject';
        connection.query(sql, (err, result) => {
            if (err) throw err;

            //result = JSON.stringify(result);
            var subjects = [];
            var values = [];
            for (var i = 0; i < result.length; i++) {
                subjects.push(result[i].subject.toString());
                values.push(parseInt(result[i].current_status));
            }
            //console.log(subjects);
            console.log(subjects);
            console.log(values);
            var subjects1 = ["abc", "bac", "cad"];
            var values1 = [2, 3, 4];
            res.render('./viewchart.ejs', { subjects: subjects1, current_status: values1, name: req.session.name });
        })
    }
    else {
        res.send("You must log in to view this page");
    }

})

app.get('/createtopic', (req, res) => {

    res.render('./topics.ejs', { exceldata: exceldata });
})

app.post('/createtopic', (req, res) => {
    var subject = req.body.subject;
    var topic = req.body.topic;
    connection.query(`insert into topic values ("${topic}","${subject}")`, (err, result) => {
        if (err) throw err;
        res.redirect('/createtopic');
    })
})