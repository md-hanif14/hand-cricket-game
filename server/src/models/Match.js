import mongoose from 'mongoose';

const matchPlayerSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  username: { type: String, required: true },
  isBot: { type: Boolean, default: false },
}, { _id: false });

const inningsSchema = new mongoose.Schema({
  battingPlayerId: { type: String, required: true },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
}, { _id: false });

const matchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true, index: true },
  mode: { type: String, enum: ['online', 'computer'], required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', null], default: null },
  players: { type: [matchPlayerSchema], required: true },
  playerIds: { type: [String], default: [], index: true },
  wicketLimit: { type: Number, required: true },
  tossWinnerId: { type: String, required: true },
  tossChoice: { type: String, enum: ['bat', 'bowl', 'not-decided'], required: true },
  innings: { type: [inningsSchema], required: true },
  winnerId: { type: String, required: true },
  result: { type: String, default: '' },
  startedAt: { type: Date },
  completedAt: { type: Date, required: true },
}, { timestamps: true });

matchSchema.index({ playerIds: 1, completedAt: -1 });
export const Match = mongoose.model('Match', matchSchema);
