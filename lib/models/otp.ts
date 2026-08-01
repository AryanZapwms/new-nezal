
import mongoose from "mongoose";

const { Schema } = mongoose;

export interface IOtp extends mongoose.Document {
  userId?: mongoose.Types.ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  pendingName?: string;
  pendingPassword?: string;
  pendingRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    pendingName: { type: String },
    pendingPassword: { type: String },
    pendingRole: { type: String },
  },
  { timestamps: true }
);

if (mongoose.models.Otp) {
  delete mongoose.models.Otp;
}

export const Otp = mongoose.model<IOtp>("Otp", otpSchema);
