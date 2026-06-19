import mongoose from "mongoose";

const adRewardTransactionSchema = new mongoose.Schema(
  {
    adNetwork: {
      type: String,
      default: ""
    },
    adUnit: {
      type: String,
      default: ""
    },
    customData: {
      type: String,
      default: ""
    },
    rewardAmount: {
      type: Number,
      default: 0
    },
    rewardItem: {
      type: String,
      default: ""
    },
    source: {
      type: String,
      default: "admob"
    },
    timestamp: {
      type: String,
      default: ""
    },
    transactionId: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true
    }
  },
  { timestamps: true }
);

const AdRewardTransactionModel = mongoose.model("AdRewardTransaction", adRewardTransactionSchema);

export default AdRewardTransactionModel;
