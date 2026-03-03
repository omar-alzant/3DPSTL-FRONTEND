import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const OrderSummary = () => {

  const {  clearCart } = useCart();

  const { state } = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = React.useState(null);
  const [items, setItems] = React.useState([]);
  
  React.useEffect(() => {
    // if (!state?.orderId) {
    //   navigate('/cart');
    //   return;
    // }
  
    const fetchOrder = async () => {
      const token = sessionStorage.getItem("token");
  
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/orders/${state.orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
  
      const data = await res.json();
  
      if (res.ok) {
        setOrder(data.order);
        setItems(data.items);
      }
    };
  
    fetchOrder();
  }, [state, navigate]);

  
  if (!order) {
    return (
      <div className="container py-5 text-center">
        <p>Loading order...</p>
      </div>
    );
  }
  

  const handleConfirm = async () => {
    try {
      // You can call an API here to mark status as 'confirmed' 
      // or simply navigate if the order was already created as 'pending'
      navigate(`/order-success/${order.id}`);
      clearCart();

    } catch (err) {
      alert("Confirmation failed. Please try again.");
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: '600px' }}>
        <div className="card-body p-4">
          <h3 className="fw-bold mb-4">Order Summary</h3>
          
          <div className="mb-4">
            {items.map((item, idx) => (
              <div key={idx} className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                <div>
                  <span className="fw-bold">{item.product_name}</span>
                  <div className="d-flex flex-row gap-4 text-muted">
                    {item.size} 
                    <div
                      key={item.sku}
                      style={{
                        backgroundColor: item.color,
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        cursor: "pointer",
                      }}
                    />
                    
                    ${item.price}

                     x{item.qty}
                  </div>
                </div>
                <span className="fw-bold">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-between fs-5 fw-bold mb-4">
            <span>Total to Pay:</span>
            <div className='d-flex text-primary flex-column'>
              <span className="text-primary">
                total amount: 
                  <span className='text-success ms-3'>
                    ${order.total_amount}
                  </span>
                </span>
              <span>
                +
              </span>
              <span className="text-primary">
                Delivery: 
                <span className='text-success ms-3'>
                  ${(order.total_amount > 50) ? 0 : 5 }
                </span>
              </span>
            </div>
          </div>

          <div className="bg-light p-3 rounded mb-4">
            <h6 className="fw-bold small text-uppercase text-muted">Shipping to:</h6>
            <p className="mb-0 small">{order.shipping_name}<br/>{order.shipping_address}, {order.shipping_city}</p>
          </div>

          <div className="d-grid gap-2">
            <button onClick={handleConfirm} className="btn btn-success btn-lg shadow-sm">
              Confirm Order
            </button>
            <button onClick={() => navigate('/cart')} className="btn btn-link text-muted">
              Cancel & Return to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;