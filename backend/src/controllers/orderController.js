const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');

const orderStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const statusTransitions = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};
const defaultDeliveryFee = 150;

const getDeliveryFee = () => {
  const configuredFee = process.env.DELIVERY_FEE_NPR === undefined
    ? defaultDeliveryFee
    : Number(process.env.DELIVERY_FEE_NPR);
  if (!Number.isFinite(configuredFee) || configuredFee < 0) {
    throw new Error('DELIVERY_FEE_NPR must be a non-negative number');
  }
  return configuredFee;
};

const httpError = (status, message) => Object.assign(new Error(message), { status });
const isValidText = (value, maxLength) => (
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
);
const isValidEmail = (value) => (
  typeof value === 'string'
  && value.length <= 254
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
);
const withSession = (query, session) => (
  session && query && typeof query.session === 'function' ? query.session(session) : query
);
const transactionsSupported = () => {
  const topologyType = mongoose.connection.client?.topology?.description?.type;
  return topologyType !== 'Single';
};

const validateDelivery = (delivery) => {
  if (!delivery || typeof delivery !== 'object' || Array.isArray(delivery)) {
    throw httpError(400, 'Delivery details are required');
  }
  const requiredText = [
    ['recipientName', 100, 'Full name'],
    ['phone', 30, 'Phone number'],
    ['province', 100, 'Province'],
    ['district', 100, 'District'],
    ['municipality', 100, 'Municipality or city'],
    ['streetAddress', 300, 'Street address'],
  ];
  for (const [field, maxLength, label] of requiredText) {
    if (!isValidText(delivery[field], maxLength)) {
      throw httpError(400, `${label} is required and must be no more than ${maxLength} characters`);
    }
  }
  if (!Number.isSafeInteger(delivery.wardNumber) || delivery.wardNumber < 1) {
    throw httpError(400, 'Ward number must be a whole number greater than zero');
  }
  if (
    delivery.instructions !== undefined
    && (typeof delivery.instructions !== 'string' || delivery.instructions.trim().length > 500)
  ) {
    throw httpError(400, 'Delivery instructions cannot exceed 500 characters');
  }
};

const getIdempotencyKey = (request) => {
  const key = request.get('Idempotency-Key');
  if (typeof key !== 'string' || key.trim().length < 8 || key.trim().length > 100) {
    throw httpError(400, 'A valid Idempotency-Key header is required');
  }
  return key.trim();
};

const populateOrderUser = (query) => query.populate('user', 'name email phone');

const placeOrder = async (request, response) => {
  validateDelivery(request.body?.delivery);
  const idempotencyKey = getIdempotencyKey(request);
  const userEmail = request.user.email;
  if (!isValidEmail(userEmail)) {
    throw httpError(400, 'A valid account email is required to place an order');
  }

  const existingOrder = await Order.findOne({
    user: request.user._id,
    idempotencyKey,
  });
  if (existingOrder) {
    return response.status(200).json({
      success: true,
      data: { order: existingOrder },
    });
  }

  const deliveryFee = getDeliveryFee();
  const session = transactionsSupported() ? await mongoose.startSession() : null;
  let createdOrder;
  let stagedOrder;
  let stagedActivity;
  const reservedProducts = [];
  try {
    const createOrder = async () => {
      const duplicate = await withSession(
        Order.findOne({ user: request.user._id, idempotencyKey }),
        session,
      );
      if (duplicate) {
        createdOrder = duplicate;
        return;
      }

      const cart = await withSession(Cart.findOne({ user: request.user._id }), session);
      if (!cart || !cart.items?.length) {
        throw httpError(400, 'Your cart is empty');
      }

      const productIds = [...new Set(cart.items.map((item) => String(item.product?._id || item.product)))];
      const products = await withSession(Product.find({ _id: { $in: productIds } }), session);
      const productsById = new Map(products.map((product) => [String(product._id), product]));
      const totalQuantities = new Map();
      const normalizedItems = cart.items.map((item) => {
        const productId = String(item.product?._id || item.product);
        const product = productsById.get(productId);
        if (!product || !product.active) {
          throw httpError(409, 'A product in your cart is no longer available');
        }
        if (
          (product.sizes?.length ? !product.sizes.includes(item.size) : Boolean(item.size))
          || (product.colors?.length ? !product.colors.includes(item.color) : Boolean(item.color))
        ) {
          throw httpError(409, `${product.name} no longer has the selected size or colour`);
        }
        totalQuantities.set(productId, (totalQuantities.get(productId) || 0) + item.quantity);
        return { item, product, productId };
      });

      for (const [productId, quantity] of totalQuantities) {
        const variantFilters = normalizedItems
          .filter((entry) => entry.productId === productId)
          .flatMap(({ item, product }) => [
            ...(product.sizes?.length ? [{ sizes: item.size }] : []),
            ...(product.colors?.length ? [{ colors: item.color }] : []),
          ]);
        const reserved = await Product.findOneAndUpdate(
          {
            _id: productId,
            active: true,
            stock: { $gte: quantity },
            ...(
              variantFilters.length
                ? { $and: variantFilters }
                : {}
            ),
          },
          { $inc: { stock: -quantity } },
          { new: true, session },
        );
        if (!reserved) {
          throw httpError(409, 'A product in your cart has insufficient stock or is no longer available');
        }
        reservedProducts.push({ productId, quantity });
        productsById.set(productId, reserved);
      }

      const orderItems = normalizedItems.map(({ item, productId }) => {
        const product = productsById.get(productId);
        return {
          product: productId,
          productName: product.name,
          image: product.image,
          size: item.size || 'One size',
          color: item.color || 'Default',
          unitPrice: product.price,
          quantity: item.quantity,
        };
      });
      const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const submittedDelivery = request.body.delivery;
      const delivery = {
        recipientName: submittedDelivery.recipientName.trim(),
        phone: submittedDelivery.phone.trim(),
        email: userEmail.toLowerCase(),
        province: submittedDelivery.province.trim(),
        district: submittedDelivery.district.trim(),
        municipality: submittedDelivery.municipality.trim(),
        wardNumber: submittedDelivery.wardNumber,
        streetAddress: submittedDelivery.streetAddress.trim(),
        instructions: submittedDelivery.instructions?.trim() || '',
        address: [
          submittedDelivery.streetAddress.trim(),
          `Ward ${submittedDelivery.wardNumber}, ${submittedDelivery.municipality.trim()}`,
          `${submittedDelivery.district.trim()}, ${submittedDelivery.province.trim()}`,
          submittedDelivery.instructions?.trim(),
        ].filter(Boolean).join(', '),
      };
      const [order] = await Order.create([{
        user: request.user._id,
        idempotencyKey,
        items: orderItems,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        delivery,
        paymentMethod: 'COD',
      }], { session });
      stagedOrder = order;
      const [activity] = await Activity.create([{
        actor: request.user._id,
        actorName: request.user.name,
        action: 'ORDER_PLACED',
        targetType: 'Order',
        targetId: order._id,
        description: `Placed order ${order.orderNumber}`,
      }], { session });
      stagedActivity = activity;
      const cartUpdate = await Cart.updateOne(
        { _id: cart._id, updatedAt: cart.updatedAt },
        { $set: { items: [] } },
        { session },
      );
      if (cartUpdate.matchedCount !== 1) {
        throw httpError(409, 'Your cart changed during checkout. Please review it and try again.');
      }
      createdOrder = order;
    };
    if (session) {
      await session.withTransaction(createOrder);
    } else {
      await createOrder();
    }
  } catch (error) {
    if (!session) {
      const rollbackErrors = [];
      const rollback = async (operation) => {
        try {
          await operation();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      };
      if (stagedActivity?._id) {
        await rollback(() => Activity.deleteOne({ _id: stagedActivity._id }));
      }
      if (stagedOrder?._id) {
        await rollback(() => Order.deleteOne({ _id: stagedOrder._id }));
      }
      for (const { productId, quantity } of reservedProducts) {
        await rollback(() => Product.updateOne(
          { _id: productId },
          { $inc: { stock: quantity } },
        ));
      }
      if (rollbackErrors.length) {
        throw new AggregateError([error, ...rollbackErrors], 'Order creation failed and inventory rollback was incomplete');
      }
    }
    if (error.code === 11000) {
      const duplicate = await Order.findOne({ user: request.user._id, idempotencyKey });
      if (duplicate) {
        return response.status(200).json({
          success: true,
          data: { order: duplicate },
        });
      }
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }

  return response.status(201).json({
    success: true,
    data: { order: createdOrder },
  });
};

const getCheckoutInfo = (request, response) => response.status(200).json({
  success: true,
  data: { deliveryFee: getDeliveryFee() },
});

const listMyOrders = async (request, response) => {
  const orders = await Order.find({ user: request.user._id }).sort({ createdAt: -1 });
  return response.status(200).json({
    success: true,
    data: { orders },
  });
};

const getMyOrder = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Order not found');
  }
  const order = await Order.findOne({ _id: request.params.id, user: request.user._id });
  if (!order) {
    throw httpError(404, 'Order not found');
  }
  return response.status(200).json({
    success: true,
    data: { order },
  });
};

const cancelMyOrder = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Order not found');
  }
  const session = transactionsSupported() ? await mongoose.startSession() : null;
  let order;
  try {
    const cancelOrder = async () => {
      order = await withSession(
        Order.findOne({ _id: request.params.id, user: request.user._id }),
        session,
      );
      if (!order) {
        throw httpError(404, 'Order not found');
      }
      if (order.status !== 'Pending') {
        throw httpError(409, 'Only pending orders can be cancelled');
      }
      await restoreStockAndCancel(order, request.user, session);
    };
    if (session) {
      await session.withTransaction(cancelOrder);
    } else {
      await cancelOrder();
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
  return response.status(200).json({
    success: true,
    data: { order },
  });
};

const restoreStockAndCancel = async (order, actor, session) => {
  if (!session) {
    const previousStatus = order.status;
    const cancellation = await Order.findOneAndUpdate(
      { _id: order._id, status: previousStatus, stockRestored: { $ne: true } },
      { $set: { status: 'Cancelled', stockRestored: true } },
      { new: true },
    );
    if (!cancellation) {
      throw httpError(409, 'This order has already been updated');
    }
    order.status = 'Cancelled';
    order.stockRestored = true;
    const restoredProducts = [];
    try {
      const quantities = new Map();
      order.items.forEach((item) => {
        const productId = String(item.product?._id || item.product);
        quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
      });
      const restorationResults = await Promise.allSettled(
        [...quantities].map(async ([productId, quantity]) => {
          const result = await Product.updateOne(
            { _id: productId },
            { $inc: { stock: quantity } },
          );
          return result.matchedCount > 0 ? { productId, quantity } : null;
        }),
      );
      restorationResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          restoredProducts.push(result.value);
        }
      });
      const restorationFailure = restorationResults.find((result) => result.status === 'rejected');
      if (restorationFailure) {
        throw restorationFailure.reason;
      }
      await Activity.create([{
        actor: actor._id,
        actorName: actor.name,
        action: 'ORDER_STATUS_UPDATED',
        targetType: 'Order',
        targetId: order._id,
        description: `Cancelled order ${order.orderNumber}`,
      }]);
      return;
    } catch (error) {
      const rollbackErrors = [];
      const rollback = async (operation) => {
        try {
          await operation();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      };
      for (const { productId, quantity } of restoredProducts) {
        await rollback(() => Product.updateOne(
          { _id: productId },
          { $inc: { stock: -quantity } },
        ));
      }
      await rollback(() => Activity.deleteOne({
        targetId: order._id,
        action: 'ORDER_STATUS_UPDATED',
        description: `Cancelled order ${order.orderNumber}`,
      }));
      await rollback(() => Order.updateOne(
        { _id: order._id, status: 'Cancelled', stockRestored: true },
        { $set: { status: previousStatus, stockRestored: false } },
      ));
      order.status = previousStatus;
      order.stockRestored = false;
      if (rollbackErrors.length) {
        throw new AggregateError([error, ...rollbackErrors], 'Cancellation failed and inventory rollback was incomplete');
      }
      throw error;
    }
  }
  if (!order.stockRestored) {
    const quantities = new Map();
    order.items.forEach((item) => {
      const productId = String(item.product?._id || item.product);
      quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
    });
    const stockUpdates = [...quantities].map(([productId, quantity]) => ({
      updateOne: {
        filter: { _id: productId },
        update: { $inc: { stock: quantity } },
      },
    }));
    if (stockUpdates.length) {
      await Product.bulkWrite(stockUpdates, { session });
    }
    order.stockRestored = true;
  }
  order.status = 'Cancelled';
  await order.save({ session });
  await Activity.create([{
    actor: actor._id,
    actorName: actor.name,
    action: 'ORDER_STATUS_UPDATED',
    targetType: 'Order',
    targetId: order._id,
    description: `Cancelled order ${order.orderNumber}`,
  }], { session });
};

const listAllOrders = async (request, response) => {
  const orders = await populateOrderUser(Order.find()).sort({ createdAt: -1 });
  return response.status(200).json({
    success: true,
    data: { orders },
  });
};

const getOrder = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Order not found');
  }
  const order = await populateOrderUser(Order.findById(request.params.id));
  if (!order) {
    throw httpError(404, 'Order not found');
  }
  return response.status(200).json({
    success: true,
    data: { order },
  });
};

const updateOrderStatus = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Order not found');
  }
  const { status } = request.body || {};
  if (!orderStatuses.includes(status)) {
    throw httpError(400, 'A valid order status is required');
  }
  const session = transactionsSupported() ? await mongoose.startSession() : null;
  let order;
  try {
    const changeStatus = async () => {
      if (status === 'Cancelled') {
        order = await withSession(Order.findById(request.params.id), session);
        if (!order) {
          throw httpError(404, 'Order not found');
        }
        if (order.status === status) {
          return;
        }
        if (!statusTransitions[order.status]?.includes(status)) {
          throw httpError(409, `Order cannot move from ${order.status} to ${status}`);
        }
        await restoreStockAndCancel(order, request.user, session);
        return;
      }

      const previousStatuses = Object.entries(statusTransitions)
        .filter(([, nextStatuses]) => nextStatuses.includes(status))
        .map(([previousStatus]) => previousStatus);
      if (!previousStatuses.length) {
        order = await withSession(Order.findById(request.params.id), session);
        if (!order) {
          throw httpError(404, 'Order not found');
        }
        if (order.status === status) {
          return;
        }
        throw httpError(409, `Order cannot move from ${order.status} to ${status}`);
      }

      const updatedAt = new Date();
      order = await withSession(Order.findOneAndUpdate(
        { _id: request.params.id, status: { $in: previousStatuses } },
        { $set: { status, updatedAt } },
        { new: false, runValidators: true, timestamps: false },
      ), session);
      if (!order) {
        order = await withSession(Order.findById(request.params.id), session);
        if (!order) {
          throw httpError(404, 'Order not found');
        }
        if (order.status === status) {
          return;
        }
        throw httpError(409, `Order cannot move from ${order.status} to ${status}`);
      }
      const previousStatus = order.status;
      order.status = status;
      order.updatedAt = updatedAt;
      await Activity.create([{
        actor: request.user._id,
        actorName: request.user.name,
        action: 'ORDER_STATUS_UPDATED',
        targetType: 'Order',
        targetId: order._id,
        description: `Updated order ${order.orderNumber} from ${previousStatus} to ${status}`,
      }], { session });
    };
    if (session) {
      await session.withTransaction(changeStatus);
    } else {
      await changeStatus();
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
  const populatedOrder = await order.populate('user', 'name email phone');
  return response.status(200).json({
    success: true,
    data: { order: populatedOrder },
  });
};

module.exports = {
  cancelMyOrder,
  getCheckoutInfo,
  getMyOrder,
  getOrder,
  listAllOrders,
  listMyOrders,
  placeOrder,
  updateOrderStatus,
};
