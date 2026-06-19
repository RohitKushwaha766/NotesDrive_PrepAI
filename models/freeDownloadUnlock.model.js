import mongoose from "mongoose";

const freeDownloadUnlockSchema = new mongoose.Schema(
  {
    adNetwork: {
      type: String,
      default: ""
    },
    adUnit: {
      type: String,
      default: ""
    },
    downloadId: {
      type: String,
      required: true
    },
    productId: {
      type: Number,
      required: true
    },
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    timestamp: {
      type: String,
      default: ""
    },
    transactionId: {
      type: String,
      required: true,
      unique: true
    }
  },
  { timestamps: true }
);

freeDownloadUnlockSchema.index({ sessionId: 1, productId: 1, downloadId: 1 });

const FreeDownloadUnlockModel = mongoose.model("FreeDownloadUnlock", freeDownloadUnlockSchema);

export default FreeDownloadUnlockModel;
