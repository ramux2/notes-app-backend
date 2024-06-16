import express, { Express, Request, Response } from "express"
import { authenticationUtilities } from "./utilities"
import { userModel } from "./models/user.models"
import { noteModel } from "./models/note.model"
import jwt, { Jwt } from "jsonwebtoken"
import dotenv from "dotenv"
import cors from 'cors'

import { connect } from "./service/database"
import { AuthenticatedRequest } from "./service/types"
import { error } from "console"

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;
const databaseUrl = process.env.DATABASE_URL || ""

connect(databaseUrl);

app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

export default app;

// Account Auth
app.post("/create-account", async (req: Request, res: Response) => {

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

  const isUser = await userModel.findOne({ email: email });

  if (isUser) {
    return res.json({
      error: true,
      message: "User already exist",
    });
  }

  const user = new userModel({
    fullName,
    email,
    password,
  });

  await user.save();

  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET as string, {
      expiresIn: "30m",
  });

  return res.json({
    error: false,
    user,
    accessToken,
    message: "Registration Successful"
  })
})

app.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  const userInfo = await userModel.findOne({ email: email });

  if (!userInfo) {
    return res.status(400).json({ message: "User not found" });
  }

  if (userInfo.email == email && userInfo.password == password) {
    const user = { user: userInfo };
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET as string, {
        expiresIn: "3600m",
      });

      return res.json({
        error: false,
        message: "Login Successful",
        email,
        accessToken,
      });
  } else {
    return res.status(400).json({
      error: true,
      message: "Invalid Credentials",
    });
  }

});

app.get("/get-user", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { user } = req.user;

  const isUser = await userModel.findOne({ _id: user._id });

  if (!isUser) {
    return res.sendStatus(401);
  }

  return res.json({
    user: {
      fullName: isUser.fullName, email: isUser.email, "_id": isUser._id, createdOn: isUser.createdOn
    },
    message: "",
  })
});

// Notes CRUD
app.post("/add-note", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { title, content, tags } = req.body;
  const { user } = req.user;

  if (!title) {
    return res.status(400).json({ error: true, message: "Title is required" });
  }

  if (!content) {
    return res.status(400).json({ error: true, message: "Content is required" });
  }

  try {
    const note = new noteModel({
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
  } catch (error) {
    return res.status(500).json({ 
      error: true, 
      message: "Internal Server Error",
    });
  }
});

app.put("/edit-note/:noteId", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
    const note = await noteModel.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res.status(404).json({ 
        error: true,
        message: "Note not found"
      });
    }

    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

app.get("/get-all-notes", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { user } = req.user;

  try {
    const notes = await noteModel.find({ userId: user._id }).sort({ isPinned: -1 });
    
    return res.json({
      error: false,
      notes,
      message: "All notes retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

app.delete("/delete-note/:noteId", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const noteId = req.params.noteId;
  const { user } = req.user;

  try {
    const note = await noteModel.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res.status(404).json({
        error: true,
        message: "Note not found",
      });
    }

    await noteModel.deleteOne({ _id: noteId, userId: user._id });

    return res.json({
      error: false,
      message: "Note deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
})

app.put("/update-note-pinned/:noteId", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const noteId = req.params.noteId;
  const { isPinned } = req.body;
  const { user } = req.user;

  try {
    const note = await noteModel.findOne({ _id: noteId, userId: user._id });

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
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
})

// Queries customizadas

// Buscar queries por tag
app.get("/notes-by-tag/:tag", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const tag = req.params.tag;
  const { user } = req.user;

  try {
    const notes = await noteModel.find({ userId: user._id, tags: tag }).sort({ createdOn: -1 });
    
    return res.json({
      error: false,
      notes,
      message: "Notes retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

// Buscar notas por intervalo de data
app.get("/notes-by-date-range", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const { user } = req.user;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: true, message: "Start date and end date are required" });
  }

  try {
    const notes = await noteModel.find({
      userId: user._id,
      createdOn: {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      }
    }).sort({ createdOn: -1 });

    return res.json({
      error: false,
      notes,
      message: "Notes retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

// Buscar notas por titulo ou conteudo
app.get("/search-notes", authenticationUtilities.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { user } = req.user;
  const { searchTerm } = req.query; // Get search term from query parameter

  if (!searchTerm || typeof searchTerm !== 'string') {
    return res.status(400).json({ error: true, message: "Search term is required and must be a string" });
  }

  try {
    const notes = await noteModel.find({
      userId: user._id,
      $text: { $search: searchTerm }, // Use text search index
    }).sort({ isPinned: -1 });

    return res.json({
      error: false,
      notes,
      message: "Search results retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});