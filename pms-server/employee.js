import express from "express";
const router = express.Router();

let data = [
    { id: 1, Name: "Ashwath" },
    { id: 2, Name: "Kumaran" },
];

const getemployees = (req, res) => {
    try {
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch employees" });
    }
};

router.get("/", getemployees);
export default router;