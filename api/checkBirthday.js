const members = require("../members.json");

module.exports = async (req, res) => {

  const now = new Date();

  const jakarta = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Jakarta"
    })
  );

  const today =
    String(jakarta.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(jakarta.getDate()).padStart(2, "0");

  const ultah = members.filter(
    x => x.tanggalLahir === today
  );

  return res.status(200).json({
    success: true,
    today,
    total: ultah.length,
    members: ultah
  });
};

