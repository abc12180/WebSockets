var socket = new WebSocket('wss://chat.starkvoip.com');
socket.onopen = function(event) {
	console.log("connected...");
	socket.onmessage = function(event) {
		console.log('Client received a message: ',event);
		if(event.data.startsWith("Welcome")) {
			var args = event.data.split(" ");
			var xhttp = new XMLHttpRequest();
			xhttp.open("GET", "auth?token=" + args[1], true);
			xhttp.send();
		}
	};
};
