import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema({
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, minlength: 3, maxlength: 20 },
  usernameLower: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  avatar: { type: String, default: '' },
  stats: { type: statsSchema, default: () => ({}) },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
