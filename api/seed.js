const { seed } = require("./_seed");

function withoutAdminPassword(state) {
  const users = (state.users || []).map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    phone: u.phone,
    branchId: u.branchId || null,
    active: Boolean(u.active)
  }));

  return {
    ...state,
    admin: {
      username: state.admin.username
    },
    users
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  return res.status(200).json({
    ok: true,
    data: withoutAdminPassword(seed)
  });
};
