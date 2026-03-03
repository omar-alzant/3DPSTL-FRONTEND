import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Form, InputGroup, Dropdown, DropdownButton } from 'react-bootstrap';
import { FiClipboard, FiFileText } from "react-icons/fi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { IoLogoWhatsapp } from 'react-icons/io5';
import { useToast } from "../context/ToastProvider";

/* ---------- COPY TO CLIPBOARD ---------- */
/* ---------- COPY TO CLIPBOARD ---------- */
const copyOrderDetails = async (order) => {

  const text = `
Order ID: ${order.id}
Customer: ${order.shipping_name}
Phone: ${order.shipping_phone}
Address: ${order.shipping_address}, ${order.shipping_city}

Items:
${order.items.map(i =>
  `- ${i.product_name} | Size: ${i.size || 'N/A'} | Qty: ${i.qty} | $${i.price}`
).join("\n")}

Total: $${order.total_amount}
Status: ${order.status}
Updated: ${new Date(order.updated_at).toLocaleString()}
`;

  await navigator.clipboard.writeText(text.trim());
};

const downloadOrderPDF = (order) => {
  const doc = new jsPDF();

  // 1️⃣ Header
  doc.setFontSize(18);
  doc.text("INVOICE", 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Order ID: ${order.id}`, 14, 22);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 27);

  // 2️⃣ Customer Details
  doc.setTextColor(0);
  doc.text("Ship To:", 14, 38);

  doc.setFont(undefined, "bold");
  doc.text(order.shipping_name, 14, 43);
  doc.setFont(undefined, "normal");

  const address = doc.splitTextToSize(
    `${order.shipping_address}, ${order.shipping_city}`,
    80
  );

  doc.text(address, 14, 48);
  doc.text(`Phone: ${order.shipping_phone}`, 14, 58);

  // 3️⃣ Table rows
  const tableRows = order.items.map((item, index) => [
    index + 1,
    item.product_name,
    item.size || "N/A",
    item.color || "N/A",
    item.qty,
    `$${item.price}`,
    `$${(item.qty * item.price).toFixed(2)}`
  ]);

  const deliveryFee = order.total_amount > 50 ? 0 : 5.0;

  if (deliveryFee > 0) {
    tableRows.push(["", "Delivery Fee", "", "", "", "", `$${deliveryFee.toFixed(2)}`]);
  } else {
    tableRows.push(["", "Delivery Fee", "", "", "", "", "FREE"]);
  }

  // 4️⃣ Table
  autoTable(doc, {
    startY: 65,
    head: [["#", "Product", "Size", "Color", "Qty", "Price", "Total"]],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },

    didParseCell: (data) => {
      // ⭐ Delivery row style
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        if (data.column.index === 1) {
          data.cell.styles.textColor = [41, 128, 185];
        }
      }
    },

    didDrawCell: (data) => {

      if (data.column.index === 3) {
    
        const hex = data.cell.raw;
    
        // تأكد أن القيمة hex حقيقية
        if (/^#([0-9A-F]{3}){1,2}$/i.test(hex)) {
    
          const hexToRgb = (hex) =>
            hex
              .replace("#", "")
              .match(/.{1,2}/g)
              .map((x) => parseInt(x, 16));
    
          const [r, g, b] = hexToRgb(hex);
    
          doc.setFillColor(r, g, b);
    
          doc.circle(
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2,
            Math.min(data.cell.width, data.cell.height) / 3,
            "F"
          );
    
          // إخفاء النص
          data.cell.text = "";
        }
      }
    
      // ⭐ Delivery row style
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
    
        if (data.column.index === 1) {
          data.cell.styles.textColor = [41, 128, 185];
        }
      }
    }
      });

  // 5️⃣ Summary
  const finalY = doc.lastAutoTable.finalY + 10;

  const grandTotal =
    parseFloat(order.total_amount) + deliveryFee;

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`Grand Total: $${grandTotal.toFixed(2)}`, 140, finalY);

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Status: ${order.status.toUpperCase()}`, 140, finalY + 7);

  // 6️⃣ Save
  doc.save(`order-${order.id.slice(0, 8)}.pdf`);
};

const sendWhatsappMessage = (clientPhoneNumber) => {
  const message = encodeURIComponent("Hello! we are the saler of 3dpstl, please can you comfirm your order below! thanks!");

  const whatsappUrl = `https://wa.me/${clientPhoneNumber}?text=${message}`;
  window.open(whatsappUrl, "_blank")
}

const AdminOrders = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  // Default sorting: Newest updates first
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });
  
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchOrders = async () => {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/orders/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.error) setOrders(data);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);
  
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/orders/admin/status/${orderId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        showToast(`${data.error || "Stock update failed"}`, "danger");
      }
  
      fetchOrders();
  
    } catch (err) {
      showToast(`"Stock error:"  ${err.message}`, "danger");
    } finally {
      setUpdatingOrderId(null);
    }
  };
  
    
  const OrderActions = ({ order }) => {
    return (
      <div className="d-flex justify-content-end gap-2">
        <Button
          size="sm"
          variant="outline-secondary"
          title="Copy order details"
          onClick={() => copyOrderDetails(order)}
        >
          <FiClipboard size={16} />
        </Button>
  
        <Button
          size="sm"
          variant="outline-primary"
          title="Download PDF"
          onClick={() => downloadOrderPDF(order)}
        >
          <FiFileText size={16} />
        </Button>

        <Button
          size="sm"
          variant="outline-success"
          title="Send Whatsapp message"
          onClick={() => sendWhatsappMessage(order.shipping_phone)}
        >
          <IoLogoWhatsapp size={16} />
        </Button>
      </div>
    );
  };
  
  
  // --- Search & Sort Logic ---
  const processedOrders = orders
    .filter(order => {
      if (!order.total_amount || order.total_amount === 0) return false;
      const searchLower = searchTerm.toLowerCase();
      const matchesCustomer = order.shipping_name?.toLowerCase().includes(searchLower);
      const matchesPhone = order.shipping_phone?.toLowerCase().includes(searchLower);
      const matchesId = order.id?.toLowerCase().includes(searchLower);
      
      const matchesItems = order.items?.some(item => 
        item.product_name?.toLowerCase().includes(searchLower)
      );
      return (matchesCustomer || matchesPhone || matchesId || matchesItems ) ;
    })
    .sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle Date sorting
      if (sortConfig.key === 'updated_at' || sortConfig.key === 'created_at') {
        return sortConfig.direction === 'asc' 
          ? new Date(aVal) - new Date(bVal) 
          : new Date(bVal) - new Date(aVal);
      }

      // Handle String sorting (status/name)
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  const handleRemoveItem = async (orderId, itemId) => {
    try {
      setUpdatingOrderId(orderId);
  
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/orders/admin/remove-item/${orderId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ itemId }),
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove item");
      }
  
      showToast("Item removed and stock restored.", "success");
      fetchOrders();
  
    } catch (err) {
      showToast(err.message, "danger");
    } finally {
      setUpdatingOrderId(null);
    }
  };
  
  const formatDate = (ts) => {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };

  return (
    <div className="container-fluid py-4 bg-dark min-vh-100">
      {/* Page Header */}
      <div className="row mb-4 br-gray-l p-2 align-items-center">
        <div className="col-md-5">
          <h2 className="fw-bold  tracking-tight mb-1">Orders Overview</h2>
          <p className=" mb-0">Manage customer transactions and shipping updates.</p>
        </div>
        
        <div className="col-md-7 d-flex flex-wrap gap-2 justify-content-md-end mt-3 mt-md-0">
          <InputGroup className="shadow-sm border-0" style={{ maxWidth: '350px' }}>
            <InputGroup.Text className=" border-end-0 text-muted">
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder="Search Customer, ID, or Item..."
              className="border-start-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <button onClick={fetchOrders} className="btn btn-success border shadow-sm px-3">
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className=" border-0 shadow-sm rounded-3">
        <div className="  py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-semibold">Transactions ({processedOrders.length})</h5>
          <div className="small text-light ">
            Sorting by: <strong>{sortConfig.key.replace('_', ' ')}</strong> ({sortConfig.direction})
          </div>
        </div>
        
        <div 

        className="table-responsive bg-dark"
        
        >
          <table 
                    style={{ backgroundColor: 'black' }}

          className="table table-hover bg-dark align-middle mb-0">
            <thead className="bg-dark">
              <tr className="text-muted small text-uppercase fw-bold">
                <th className="px-4 py-3 cursor" onClick={() => requestSort('shipping_name')}>
                  Customer {sortConfig.key === 'shipping_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3">Address</th>
                <th className="py-3">Items Summary</th>
                <th className="py-3">Total</th>
                <th className="py-3 cursor" onClick={() => requestSort('status')}>
                  Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 text-end">Actions</th>

                <th className="px-4 py-3 text-end cursor" onClick={() => requestSort('updated_at')}>
                  Last Updated {sortConfig.key === 'updated_at' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {processedOrders.map(order => (
                (order.total_amount > 0 && 
                <tr key={order.id}>
                  {/* Customer Info */}
                  <td className="px-4">
                    <div className="fw-bold text-dark">{order.shipping_name}</div>
                    <div className="text-muted small">{order.shipping_phone}</div>
                    <div className="font-monospace text-uppercase text-secondary" style={{ fontSize: '0.7rem' }}>
                      ID: {order.id.slice(0, 8)}
                    </div>
                  </td>

                  {/* Address */}
                  <td className="text-muted small" style={{ maxWidth: '150px' }}>
                    {order.shipping_address}, {order.shipping_city}
                  </td>

                  {/* Your Item Details UI */}
                  <td className="py-3">
                    {Array.isArray(order.items) && order.items.map((item, idx) => (
                      <div key={idx} className="p-2 mb-2 rounded-2 border-start border-4 border-primary-subtle shadow-sm" style={{ minWidth: '240px' }}>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={
                            updatingOrderId === order.id ||
                            order.status === "delivered" ||
                            order.status === "confirmed"
                          }
                          hidden={
                            updatingOrderId === order.id ||
                            order.status === "delivered" ||
                            order.status === "confirmed"
                          }
                          
                          onClick={() => handleRemoveItem(order.id, item.item_id)}
                        >
                          ✕
                        </Button>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <Button 
                            variant="link" 
                            className="p-0 text-decoration-none fw-bold text-dark small text-truncate" 
                            style={{maxWidth: '140px'}}
                            title={`Open ${item.product_name}`}
                            onClick={() => navigate(`/item/${item.item_id}`)}
                          >
                            {item.product_name}
                          </Button>

                          <div className="d-flex align-items-center gap-2">
                            <span
                              className="rounded-circle border"
                              title={item.color}
                              style={{ backgroundColor: item.color, width: '12px', height: '12px', display: 'inline-block' }}
                            />
                            <span className="badge text-secondary border extra-small" style={{fontSize: '0.7rem'}}>
                               {item.size || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between text-primary small fw-bold">
                           <span>Qty: {item.qty || 1}</span>
                           <span className="text-dark">${item.price}</span>
                        </div>
                      </div>
                    ))}
                  </td>

                  {/* Total Amount */}
                  <td>
                    <span className="fw-bold text-dark">${order.total_amount}  {order.total_amount < 50 ? "+ $5" : ""}</span>
                  </td>
                  
                  {/* Status & Action */}
                  <td>
                    <div className="d-flex flex-column gap-2">
                      <StatusPill status={order.status} />
                      <select
                        className="form-select form-select-sm border-secondary-subtle"
                        value={order.status}
                        disabled={updatingOrderId === order.id}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                      >

                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 text-end">
                    <OrderActions order={order} />
                  </td>

                  {/* Dates */}
                  <td className="px-4 text-end">
                    <div className="small text-dark fw-semibold">{formatDate(order.updated_at)}</div>
                    <div className="extra-small text-muted" style={{fontSize: '0.7rem'}}>Created: {formatDate(order.created_at)}</div>
                  </td>
                </tr>
                )
              ))}
              {processedOrders.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No orders found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Professional Pills
const StatusPill = ({ status }) => {
  const config = {
    pending: { bg: '#fff7ed', text: '#9a3412', label: 'Pending' },
    confirmed: { bg: '#eff6ff', text: '#1e40af', label: 'Confirmed' },
    delivered: { bg: '#f0fdf4', text: '#166534', label: 'Delivered' },
    // delivered: { bg: '#fef2f2', text: '#991b1b', label: 'delivered' },
  };
  const current = config[status] || config.pending;
  return (
    <span className="badge rounded-pill" style={{
      backgroundColor: current.bg,
      color: current.text,
      padding: '0.5em 1em',
      fontSize: '0.7rem',
      fontWeight: '700',
      border: `1px solid ${current.text}20`,
      width: 'fit-content'
    }}>
      {current.label}
    </span>
  );
};

export default AdminOrders;