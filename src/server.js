// Entry point — loads environment variables and starts the HTTP server
require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Analytics Dashboard running on http://localhost:${PORT}`);
});
