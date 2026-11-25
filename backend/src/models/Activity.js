const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Activity actor is required'],
    },
    actorName: {
      type: String,
      required: [true, 'Activity actor name snapshot is required'],
      trim: true,
    },
    action: {
      type: String,
      enum: [
        'ORDER_PLACED',
        'ORDER_STATUS_UPDATED',
        'PRODUCT_CREATED',
        'PRODUCT_UPDATED',
        'PRODUCT_DELETED',
        'CATEGORY_CREATED',
        'CATEGORY_UPDATED',
        'CATEGORY_DELETED',
      ],
      required: [true, 'Activity type is required'],
    },
    targetType: {
      type: String,
      enum: ['Order', 'Product', 'Category'],
      required: [true, 'Activity target type is required'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Activity target ID is required'],
    },
    description: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true,
      maxlength: [500, 'Activity description cannot exceed 500 characters'],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
