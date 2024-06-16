import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
    title: {
        required: true,
        type: String,
    },
    content: {
        required: true,
        type: String,
    },
    tags: {
        default: [],
        type: [String],
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
    userId: {
        type: String,
        required: true,
    },
    createdOn: {
        type: Date,
        default: new Date().getTime(),
    },
})

noteSchema.index({ title: "text", content: "text" });

export const noteModel = mongoose.model("Note", noteSchema)