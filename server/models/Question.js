import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  speaker: { type: String, required: true },
  text: { type: String, required: true },
  approved: { type: Boolean, default: false },
  votes: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() }
});

export default mongoose.model("Question", QuestionSchema);
