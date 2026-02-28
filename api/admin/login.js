const { seed } = require("../_seed");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { username, password } = req.body || {};
  const isValid = username === seed.admin.username && password === seed.admin.password;

  if (!isValid) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  return res.status(200).json({
    ok: true,
    admin: {
      username: seed.admin.username
    }
  });
};
