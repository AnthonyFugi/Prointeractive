import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Business from '../models/Business.js';
import { orderPlacedEmails, orderStatusEmail } from '../utils/email.js';

/**
 * POST /api/orders  (customer)
 * Body: { items: [{ productId, quantity }], shippingAddress, paymentMethod }
 * All items must belong to ONE business (one order per business).
 */
export const createOrder = async (req, res, next) => {
  try {
    const { items = [], shippingAddress = {}, paymentMethod } = req.body;
    if (!items.length) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    const ids = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: ids }, isActive: true });
    if (products.length !== items.length) {
      return res.status(400).json({ success: false, message: 'One or more products unavailable' });
    }

    const businessIds = new Set(products.map((p) => p.business.toString()));
    if (businessIds.size > 1) {
      return res.status(400).json({ success: false, message: 'All items must be from the same business' });
    }

    let total = 0;
    const orderItems = items.map((i) => {
      const p = products.find((pr) => pr._id.toString() === i.productId);
      const qty = Math.max(1, Number(i.quantity) || 1);
      if (p.stock < qty) {
        throw Object.assign(new Error(`Insufficient stock for "${p.name}"`), { statusCode: 400 });
      }
      total += p.price * qty;
      return { product: p._id, name: p.name, price: p.price, quantity: qty };
    });

    // Decrement stock
    await Promise.all(
      orderItems.map((i) =>
        Product.updateOne({ _id: i.product }, { $inc: { stock: -i.quantity } })
      )
    );

    const order = await Order.create({
      customer: req.user._id,
      business: [...businessIds][0],
      items: orderItems,
      totalAmount: Math.round(total * 100) / 100,
      currency: products[0].currency,
      shippingAddress,
      paymentMethod,
    });

    const business = await Business.findById(order.business).populate('owner', 'email');
    orderPlacedEmails({
      order,
      customer: req.user,
      ownerEmail: business?.owner?.email,
      businessName: business?.name || 'the business',
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/mine  (customer's own orders)
export const myOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('business', 'name slug')
      .sort('-createdAt');
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/business  (orders received by my business)
export const businessOrders = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) return res.status(400).json({ success: false, message: 'No business profile' });
    const { status } = req.query;
    const filter = { business: business._id };
    if (status) filter.status = status;
    const orders = await Order.find(filter).populate('customer', 'name email').sort('-createdAt');
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('business', 'name slug owner')
      .populate('customer', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isCustomer = order.customer._id.equals(req.user._id);
    const isSeller = order.business.owner.equals(req.user._id);
    if (!isCustomer && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not your order' });
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/status  (seller advances status; customer may cancel while pending)
const TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('business', 'owner');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isSeller = order.business.owner.equals(req.user._id);
    const isCustomer = order.customer.equals(req.user._id);
    const cancellingOwnPending = isCustomer && status === 'cancelled' && order.status === 'pending';

    if (!isSeller && !cancellingOwnPending && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not allowed to change this order' });
    }
    if (!TRANSITIONS[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move order from "${order.status}" to "${status}"`,
      });
    }

    // Restock on cancellation
    if (status === 'cancelled') {
      await Promise.all(
        order.items.map((i) =>
          mongoose.model('Product').updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })
        )
      );
    }
    if (status === 'paid') order.paidAt = new Date();
    if (status === 'delivered') order.deliveredAt = new Date();

    order.status = status;
    await order.save();

    if (isSeller || req.user.role === 'admin') {
      const buyer = await mongoose.model('User').findById(order.customer).select('email');
      const biz = await Business.findById(order.business._id || order.business).select('name');
      orderStatusEmail({ order, customerEmail: buyer?.email, businessName: biz?.name || 'the business' });
    }

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};
