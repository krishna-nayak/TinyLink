import sequelize from "./config/db.js";
import express from "express";
import Link from "./models/Links.js";

const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Create a new short link
app.post("/api/links", async (req, res) => {
  try {
    const { url, short_key } = req.body || {};

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "`url` is required and must be a string" });
    }

    let key = short_key;

    if (key) {
      // check uniqueness
      const existing = await Link.findOne({ where: { short_key: key } });
      if (existing) {
        return res.status(409).json({ error: "short_key already in use" });
      }
    } else {
      // generate a unique short_key
      const generateKey = (len = 6) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let out = "";
        for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      };

      // attempt up to a few times to avoid infinite loop
      let attempts = 0;
      do {
        key = generateKey(6);
        attempts += 1;
        // eslint-disable-next-line no-await-in-loop
        // continue looping while key exists and attempts < 5
      } while ((await Link.findOne({ where: { short_key: key } })) && attempts < 5);

      // final check
      if (await Link.findOne({ where: { short_key: key } })) {
        return res.status(500).json({ error: "Could not generate unique short key, try again" });
      }
    }

    const created = await Link.create({ short_key: key, url });

    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal_server_error" });
  }
});

// List all links
app.get("/api/links", async (req, res) => {
  try {
    const links = await Link.findAll({ order: [["id", "DESC"]] });
    return res.json(links);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal_server_error" });
  }
});

// Get link by code and increment stats
app.get("/api/links/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const link = await Link.findOne({ where: { short_key: code } });
    if (!link) return res.status(404).json({ error: "not_found" });

    // increment stats and update last_clicked_time
    link.stats = (link.stats || 0) + 1;
    link.last_clicked_time = new Date();
    await link.save();

    // Redirect the client to the stored URL using an explicit 302 status code.
    return res.redirect(302, link.url);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal_server_error" });
  }
});

// Delete a link by code
app.delete("/api/links/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const link = await Link.findOne({ where: { short_key: code } });
    if (!link) return res.status(404).json({ error: "not_found" });

    await link.destroy();
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal_server_error" });
  }
});

app.listen(port, async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log(`Example app listening on port ${port}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
});
