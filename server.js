const express = require("express");
const app = express();
app.use(express.static(__dirname + "/docs"));
app.listen(process.env.PORT || 8001);

app.use((req, res) => {
	res.status(404).sendFile(__dirname + "/docs/404.html");
});
