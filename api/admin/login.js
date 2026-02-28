const { seed } = require("../_seed");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { username, password } = req.body || {};
  const user = (seed.users || []).find(
    (u) => u.username === username && u.password === password && u.active
  );
  const legacyValid = username === seed.admin.username && password === seed.admin.password;

  if (!user && !legacyValid) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const loginUser =
    user ||
    {
      id: "u_legacy_admin",
      username: seed.admin.username,
      name: "Legacy Admin",
      role: "admin",
      branchId: null
    };

  return res.status(200).json({
    ok: true,
    admin: {
      userId: loginUser.id,
      username: loginUser.username,
      name: loginUser.name,
      role: loginUser.role,
      branchId: loginUser.branchId || null
    }
  });
};
