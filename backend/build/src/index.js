"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const utilities_1 = require("./utilities");
const user_models_1 = require("./models/user.models");
const note_model_1 = require("./models/note.model");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./service/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
const databaseUrl = process.env.DATABASE_URL || "";
(0, database_1.connect)(databaseUrl);
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "*",
}));
exports.default = app;
// Account Auth
app.post("/create-account", async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName) {
        return res.status(400).json({ error: true, message: "Full Name is required" });
    }
    if (!email) {
        return res.status(400).json({ error: true, message: "Email is required" });
    }
    if (!password) {
        return res.status(400).json({ error: true, message: "Password is required" });
    }
    const isUser = await user_models_1.userModel.findOne({ email: email });
    if (isUser) {
        return res.json({
            error: true,
            message: "User already exist",
        });
    }
    const user = new user_models_1.userModel({
        fullName,
        email,
        password,
    });
    await user.save();
    const accessToken = jsonwebtoken_1.default.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30m",
    });
    return res.json({
        error: false,
        user,
        accessToken,
        message: "Registration Successful"
    });
});
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }
    const userInfo = await user_models_1.userModel.findOne({ email: email });
    if (!userInfo) {
        return res.status(400).json({ message: "User not found" });
    }
    if (userInfo.email == email && userInfo.password == password) {
        const user = { user: userInfo };
        const accessToken = jsonwebtoken_1.default.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "3600m",
        });
        return res.json({
            error: false,
            message: "Login Successful",
            email,
            accessToken,
        });
    }
    else {
        return res.status(400).json({
            error: true,
            message: "Invalid Credentials",
        });
    }
});
app.get("/get-user", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const { user } = req.user;
    const isUser = await user_models_1.userModel.findOne({ _id: user._id });
    if (!isUser) {
        return res.sendStatus(401);
    }
    return res.json({
        user: {
            fullName: isUser.fullName, email: isUser.email, "_id": isUser._id, createdOn: isUser.createdOn
        },
        message: "",
    });
});
// Notes CRUD
app.post("/add-note", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;
    const { user } = req.user;
    if (!title) {
        return res.status(400).json({ error: true, message: "Title is required" });
    }
    if (!content) {
        return res.status(400).json({ error: true, message: "Content is required" });
    }
    try {
        const note = new note_model_1.noteModel({
            title,
            content,
            tags: tags || [],
            userId: user._id,
        });
        await note.save();
        return res.json({
            error: false,
            note,
            message: "Registration Successful"
        });
    }
    catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});
app.put("/edit-note/:noteId", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned } = req.body;
    const { user } = req.user;
    if (!title && !content && !tags) {
        return res.status(400).json({
            error: true,
            message: "No changes provided"
        });
    }
    try {
        const note = await note_model_1.noteModel.findOne({ _id: noteId, userId: user._id });
        if (!note) {
            return res.status(404).json({
                error: true,
                message: "Note not found"
            });
        }
        if (title)
            note.title = title;
        if (content)
            note.content = content;
        if (tags)
            note.tags = tags;
        if (isPinned)
            note.isPinned = isPinned;
        await note.save();
        return res.json({
            error: false,
            note,
            message: "Note updated successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});
app.get("/get-all-notes", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const { user } = req.user;
    try {
        const notes = await note_model_1.noteModel.find({ userId: user._id }).sort({ isPinned: -1 });
        return res.json({
            error: false,
            notes,
            message: "All notes retrieved successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});
app.delete("/delete-note/:noteId", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { user } = req.user;
    try {
        const note = await note_model_1.noteModel.findOne({ _id: noteId, userId: user._id });
        if (!note) {
            return res.status(404).json({
                error: true,
                message: "Note not found",
            });
        }
        await note_model_1.noteModel.deleteOne({ _id: noteId, userId: user._id });
        return res.json({
            error: false,
            message: "Note deleted successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});
app.put("/update-note-pinned/:noteId", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { isPinned } = req.body;
    const { user } = req.user;
    try {
        const note = await note_model_1.noteModel.findOne({ _id: noteId, userId: user._id });
        if (!note) {
            return res.status(404).json({
                error: true,
                message: "Note not found"
            });
        }
        note.isPinned = isPinned;
        await note.save();
        return res.json({
            error: false,
            note,
            message: "Note pinned successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});
// Queries customizadas
// Buscar notas
app.get("/search-notes/", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const { query } = req.query;
    const { user } = req.user;
    if (typeof query !== 'string') {
        return res.status(400).json({ error: true, message: "Search query is required" });
    }
    try {
        const matchingNotes = await note_model_1.noteModel.find({
            userId: user._id,
            $or: [
                { title: { $regex: new RegExp(query, "i") } },
                { content: { $regex: new RegExp(query, "i") } }
            ],
        });
        return res.json({
            error: false,
            notes: matchingNotes,
            message: "Notes retrieved successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});
// Buscar queries por tag
app.get("/notes-by-tag/:tag", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const tag = req.params.tag;
    const { user } = req.user;
    try {
        const notes = await note_model_1.noteModel.find({ userId: user._id, tags: tag }).sort({ createdOn: -1 });
        return res.json({
            error: false,
            notes,
            message: "Notes retrieved successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});
// Buscar notas por intervalo de data
app.get("/notes-by-date-range", utilities_1.authenticationUtilities.authenticateToken, async (req, res) => {
    const { startDate, endDate } = req.query;
    const { user } = req.user;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: true, message: "Start date and end date are required" });
    }
    try {
        const notes = await note_model_1.noteModel.find({
            userId: user._id,
            createdOn: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).sort({ createdOn: -1 });
        return res.json({
            error: false,
            notes,
            message: "Notes retrieved successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
