const { seed } = require("./_seed");

function withoutAdminPassword(state) {
  return {
    ...state,
    admin: {
      username: state.admin.username
    }
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
