import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Card, Form, Button, InputGroup } from "react-bootstrap";
import Image from 'react-bootstrap/Image';
import { Tabs, Tab } from "react-bootstrap";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useToast } from "../context/ToastProvider";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MyStudioOrders from "../studio/components/MyStudioOrders";
import "../Style/Studio.css";

export default function ProfilePage() {
    const [profile, setProfile] = useState({ full_name: "", phone: "", avatar: "" });
    const [originalProfile, setOriginalProfile] = useState(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState('');

    const [preview, setPreview] = useState(null);
    const authUrl = `${process.env.REACT_APP_API_URL}/api/auth`
    const token = localStorage.getItem('token');
    const fileInputRef = useRef(null);
    const [orders, setOrders] = useState([]);
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "orders" ? "orders" : "profile");
    const [showPassword, setShowPassword] = useState(false);
    const [currentEmail, setCurrentEmail] = useState("");
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { showToast } = useToast();
    const { saveToken, setProfile: setAuthProfile } = useAuth();
  
      useEffect(() => {
        const loadOrders = async () => {
          try {
            const res = await fetch(
              `${process.env.REACT_APP_API_URL}/api/orders/my`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );
      
            if (!res.ok) {
              const err = await res.json();
              showToast(`${err.error || "Failed to load orders"}`, "danger");
              return;
            }
      
            const data = await res.json();
            setOrders(data);
          } catch (err) {
            showToast(err.message, "danger");
          }
        };
      
        loadOrders();
      }, []);
      

      useEffect(() => {
        const load = async () => {
          try {
            const res = await fetch(authUrl, {
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            });

            // Detect backend errors (status !== 200)
            if (!res.ok) {
              const errBody = await res.json();
              showToast(`${errBody.error || "Unknown error"}`, "danger");
            }
      
            const data = await res.json();
            setProfile(data);
            setOriginalProfile(data);
      
          } catch (err) {
            showToast(err.message, "danger"); // show the backend message
          }
        };
      
        load();
      }, []);
      

  const hasChanges = () => {
    if (!originalProfile) return false;
  
    return (
      profile.full_name !== originalProfile.full_name ||
      profile.phone !== originalProfile.phone ||
      profile.avatar !== originalProfile.avatar
    );
  };
  
  const saveProfile = async () => {
    try {
      const res = await fetch(authUrl, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: profile.full_name, phone: profile.phone, avatar: profile.avatar }),
      });
      const data = await res.json().catch(() => ({}));

      // the server answers with the saved profile (or { error })
      if (!res.ok) {
        showToast(data.error || "Failed to update the profile!", "danger");
        return;
      }

      setProfile(data);
      setOriginalProfile(data);
      // keep the navbar / other tabs in sync
      const stored = (() => { try { return JSON.parse(localStorage.getItem("Profile") || "{}"); } catch { return {}; } })();
      const merged = { ...stored, full_name: data.full_name, phone: data.phone, avatar: data.avatar };
      localStorage.setItem("Profile", JSON.stringify(merged));
      localStorage.removeItem("profile"); // old wrong key
      setAuthProfile(merged);
      showToast("Profile updated!", "success");
    } catch (err) {
      showToast(err.message || "Failed to update the profile!", "danger");
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64Only = typeof reader.result === 'string' ? reader.result.split(',')[1] : '';
        const base64 =  `data:image/png;base64,${base64Only}`;

      setProfile(prev => ({...prev, avatar: base64})); // base64
      setPreview(base64);      // preview
    };
    
    reader.readAsDataURL(file); // convert image -> base64
  };
    
  

  const changePassword = async () => {
    if (!currentEmail.trim()) return showToast("Please type your email to confirm.", "danger");
    if (password.length < 6) return showToast("Password must be at least 6 characters.", "danger");
    if (password !== confirmPassword) return showToast("The two passwords don't match.", "danger");
    const res = await fetch(
      `${authUrl}/updatePwd`,
      {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        body: JSON.stringify({ currentEmail, newPassword: password }),
      }
    );

    const data = await res.json();
    if (res.ok && !data.error) {
        // the server issues a new session token — keep it, otherwise the next request logs the user out
        if (data.token) saveToken(data.token);
        showToast("Password updated successfully!", "success");
        setPassword("")
        setConfirmPassword("")
        setCurrentEmail("")
      } else {
        showToast(data.error || "Something went wrong", "danger");
      }
    };

  return (
    (
        <>
      

    <Container className="py-5">
    <Card className="p-4 shadow-sm">
  <h3 className="mb-4">My Account</h3>

  <Tabs
    activeKey={activeTab}
    onSelect={(k) => setActiveTab(k)}
    className="mb-4"
  >
    {/* ================= PROFILE TAB ================= */}
    <Tab eventKey="profile" title="Profile Details">
      
      {/* Avatar */}
      <Form.Group className="d-flex justify-content-center mb-3">
        <div
          className="cursor image-Container"
          onClick={() => fileInputRef.current.click()}
        >
          <Form.Control
            type="file"
            ref={fileInputRef}
            hidden
            accept="image/*"
            onChange={handleAvatarChange}
          />

          <Image
            width="100"
            height="100"
            src={profile.avatar || "./thumbnail.png"}
            roundedCircle
          />
        </div>
      </Form.Group>

      {/* Name */}
      <Form.Group className="mb-3">
        <Form.Label>Full Name</Form.Label>
        <Form.Control
          type="text"
          value={profile.full_name}
          onChange={(e) =>
            setProfile({ ...profile, full_name: e.target.value })
          }
        />
      </Form.Group>

      {/* Phone */}
      <Form.Group className="mb-3">
        <Form.Label>Phone Number</Form.Label>
        <Form.Control
          type="text"
          value={profile.phone}
          onChange={(e) =>
            setProfile({ ...profile, phone: e.target.value })
          }
        />
      </Form.Group>

      <Button disabled={!hasChanges()} onClick={saveProfile}>
        Save Changes
      </Button>

      <hr />
 

      <Form.Group className="mb-3">
            <InputGroup>
              <Form.Control
                type={'text' }
                placeholder="Your Email"
                value={currentEmail}
                onChange={e => setCurrentEmail(e.target.value)}
                required
              />
            </InputGroup>
          </Form.Group>

      <Form.Group className="mb-3">
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(v => !v)}
                style={{ border: 'none' }}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </Button>
            </InputGroup>
          </Form.Group>

          {/* Confirm Password */}
          <Form.Group className="mb-4">
            <InputGroup>
              <Form.Control
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowConfirmPassword(v => !v)}
                style={{ border: 'none' }}
              >
                {showConfirmPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </Button>
            </InputGroup>
          </Form.Group>

      <Button variant="warning" onClick={changePassword}>
        Update Password
      </Button>

    </Tab>

    {/* ================= ORDERS TAB ================= */}
    <Tab eventKey="orders" title="My Orders">

      <h6 className="mt-3 mb-2">Shop orders</h6>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        orders.map((order) => (
          <Card key={order.id} className="mb-3 p-3 shadow-sm">
            <Row>
              <Col md={6}>
                <strong>Order ID:</strong> {order.id}
              </Col>
              <Col md={6} className="text-end">
                <strong>Status:</strong> {order.status}
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Total:</strong> ${order.total_amount}
              </Col>
            </Row>
            <Row>
              <Col>
                <small>
                  {new Date(order.updated_at).toLocaleString()}
                </small>
              </Col>
            </Row>
          </Card>
        ))
      )}

      <h6 className="mt-4 mb-2">Studio orders (custom designs)</h6>
      <MyStudioOrders />

    </Tab>
  </Tabs>
</Card>
    </Container>
    </>

            )
    );
    }
