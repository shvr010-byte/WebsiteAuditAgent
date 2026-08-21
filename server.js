const express = require("express");
const cors = require("cors");

const auditRoutes = require("./routes/audit");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {

    res.json({
        status: "running",
        project: "AI Website Audit Agent"
    });

});

app.use("/api/audit", auditRoutes);

const PORT = 3000;

app.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);

});