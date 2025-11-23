import sequelize from "./config/db.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Link from "./models/Links.js";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// views and static assets (views/ and public/ are at project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "..", "public")));

//Dashboard page
app.get("/", (req, res) => {
  // Dashboard page - server renders the list of links for simpler frontend
  (async () => {
    try {
      const links = await Link.findAll({ order: [["id", "DESC"]] });
      return res.render("dashboard", { links });
    } catch (err) {
      console.error("Failed to load links for dashboard:", err && err.message);
      return res.render("dashboard", { links: [] });
    }
  })();
});

// Human-facing health page (HTML)
app.get("/healthz.html", async (req, res) => {
  try {
    await sequelize.authenticate();
    const ctx = { status: "ok", db: "ok", version: "1.0" };
    return res.status(200).render("healthz", ctx);
  } catch (err) {
    console.error("Health page failed:", err && err.message);
    const ctx = { status: "fail", db: "down", version: "1.0" };
    return res.status(500).render("healthz", ctx);
  }
});

// Stats page (UI) for a single code
app.get("/code/:code", (req, res) => {
  const { code } = req.params;
  res.render("stats", { code });
});

// Health check endpoint
app.get("/healthz", async (req, res) => {
  try {
    await sequelize.authenticate();
    // Always return JSON for health checks
    return res.status(200).json({ ok: true, db: "ok", version: "1.0" });
  } catch (err) {
    console.error("Health check failed:", err && err.message);
    return res.status(500).json({ ok: false, db: "down", version: "1.0" });
  }
});

// Get link by code and increment stats
app.get("/:code", async (req, res) => {
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
      } while ((await Link.findOne({ where: { short_key: key } })) && attempts < 5);

      // final check
      if (await Link.findOne({ where: { short_key: key } })) {
        return res.status(500).json({ error: "Could not generate unique short key, try again" });
      }
    }

    const created = await Link.create({ short_key: key, url });

    // If the client accepts HTML (e.g. a browser form submit), redirect back
    // to the dashboard so non-JS users get a friendly page instead of raw JSON.
    if (req.accepts && req.accepts("html")) {
      return res.redirect(303, "/");
    }

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

// Get stats for a single short code
app.get("/api/links/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const link = await Link.findOne({ where: { short_key: code } });
    if (!link) return res.status(404).json({ error: "not_found" });

    // Return a stats-focused payload
    const { short_key, url, stats, last_clicked_time, createdAt, updatedAt } = link;
    return res.json({ short_key, url, stats, last_clicked_time, createdAt, updatedAt });
  } catch (err) {
    console.error("Get link stats failed:", err && err.message);
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
