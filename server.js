const https     = require('https')
const fs        = require('fs')
const path 		= require('path');
const express   = require('express')
const expressWs = require('express-ws')
const cookieParser = require('cookie-parser');
const session 	= require("express-session");
const crypto 	= require('crypto');


const serverOptions = {
	cert: fs.readFileSync('ssl/chat.starkvoip.com.crt'),
	key: fs.readFileSync('ssl/chat.starkvoip.com.key')
}

var clients = [ ];
var recentlyclosedclients = [ ];

const app       = express()
const server    = https.createServer(serverOptions, app)
app.use(cookieParser());
app.use(session({
  secret: 'the quick brown fox jumps over the lazy dog',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

expressWs(app, server)

app.ws('/', (ws, req) => {
	var reconn = false;
	ws.cookies = req.cookies;
	for (var n=0; n < recentlyclosedclients.length; n++) {
		if(recentlyclosedclients[n].cookies['connect.sid'] == req.cookies['connect.sid']) {
			reconn = true;
		}
	}
	if(reconn == false) {
		for (var i=0; i < clients.length; i++) {
			if(clients[i].authed == true) 
				clients[i].send("New client!");
		}
    	console.log((new Date()) + " Peer " + req.ip + " connected.");
	} else {
		console.log((new Date()) + " Peer " + req.ip + " reconnected.")
	}
	clients.push(ws);

	// Generate a random token, send it to the web socket, the front end will send it back to us as a GET request.
	crypto.randomBytes(48, (err, buf) => {
		console.log(`${buf.length} bytes of random data: ${buf.toString('hex')}`);
		ws.token = buf.toString('hex');
		ws.authed = false;
		ws.send("Welcome " + ws.token);
	});

	// When we get a message from the client, we just sent it back (echo server)
	ws.on('message', msg => {
		console.log(msg);
	    ws.send(msg)
    })

	// Client disconnected; TODO Remove from client list
    ws.on('close', () => {		
		for (var i=0; i < clients.length; i++) 	if(clients[i] == ws) clients.splice(i,1);
		ws.died = Date.now();
		recentlyclosedclients.push(ws);
		console.log(ws.cookies);
		console.log((new Date()) + " Peer " + req.ip + " disconnected.");
    })
})

// Our index
app.get('/', function(req, res){
	if (req.session.views) {
	    req.session.views++;
	}
	else {
		req.session.views = 1;
	}
	console.log(req.session.views);
    res.sendFile(path.join(__dirname,"static","index.html"));
});

// When the web socket is opened it generates a token-we store it and the client sends that token server. We check it here. TODO cookies and session stuff
app.get('/auth', function(req, res){
	res.send(req.query.token);
	for (var i=0; i < clients.length; i++) {
		if(clients[i].token == req.query.token) {
			clients[i].send("Authentication Success");
			clients[i].authed = true;
		}
    }
});

app.get('*', function(req, res){
	let reqfile = path.join(__dirname,"static",req.path);
	if (fs.existsSync(reqfile)) {
		console.log("200: " + reqfile)
    	res.sendFile(reqfile);
	}
	else {
		console.log("404: " + reqfile);
		res.status(404).send("File not found");
	}
});

server.listen(443)
