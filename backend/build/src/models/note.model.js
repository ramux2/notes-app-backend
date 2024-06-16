"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.noteModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const noteSchema = new mongoose_1.default.Schema({
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
});
noteSchema.index({ title: "text", content: "text" });
exports.noteModel = mongoose_1.default.model("Note", noteSchema);
