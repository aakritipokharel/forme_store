import ProductImage from './ProductImage';
import { formatNpr } from '../utils/currency';

function OrderDetails({ order, showDelivery = true }) {
  return (
    <div className="order-detail-content">
      <section className="order-items" aria-label="Ordered items">
        {order.items.map((item) => (
          <article className="order-item" key={item._id || `${item.product}-${item.size}-${item.color}`}>
            <div className="order-item-image">
              <ProductImage src={item.image} alt={item.productName} />
            </div>
            <div className="order-item-copy">
              <h3>{item.productName}</h3>
              <p>
                Size: {item.size} <span aria-hidden="true">·</span> Colour: {item.color}
              </p>
              <p>Quantity: {item.quantity}</p>
            </div>
            <strong>{formatNpr(item.unitPrice * item.quantity)}</strong>
          </article>
        ))}
      </section>

      <aside className="order-summary">
        <h2>Order summary</h2>
        <div><span>Subtotal</span><strong>{formatNpr(order.subtotal)}</strong></div>
        <div><span>Delivery</span><strong>{formatNpr(order.deliveryFee)}</strong></div>
        <div className="order-summary-total"><span>Total</span><strong>{formatNpr(order.total)}</strong></div>
        <div><span>Payment</span><strong>Cash on Delivery</strong></div>
        {showDelivery && (
          <section className="order-delivery">
            <h2>Delivery details</h2>
            <p><strong>{order.delivery.recipientName}</strong></p>
            <p>{order.delivery.phone}</p>
            <p>{order.delivery.email}</p>
            <p>{order.delivery.streetAddress}</p>
            <p>Ward {order.delivery.wardNumber}, {order.delivery.municipality}</p>
            <p>{order.delivery.district}, {order.delivery.province}</p>
            {order.delivery.instructions && <p>Instructions: {order.delivery.instructions}</p>}
          </section>
        )}
      </aside>
    </div>
  );
}

export default OrderDetails;
