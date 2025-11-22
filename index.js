import sequelize from "./db.js";
import express from "express";

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  console.log(`Example app listening on port ${port}`);
});
