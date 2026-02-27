import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Card, Form, Button, InputGroup } from "react-bootstrap";
import Image from 'react-bootstrap/Image';
import { Tabs, Tab } from "react-bootstrap";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useToast } from "../context/ToastProvider";

export default function ProfilePage() {
    const [profile, setProfile] = useState({ full_name: "", phone: "", avatar: "" });
    const [originalProfile, setOriginalProfile] = useState(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState('');

    const [preview, setPreview] = useState(null);
    const authUrl = `${process.env.REACT_APP_API_URL}/api/auth`
    const token = sessionStorage.getItem('token');
    const fileInputRef = useRef(null);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState("profile");
    const [showPassword, setShowPassword] = useState(false);
    const [currentEmail, setCurrentEmail] = useState("");
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { showToast } = useToast();
  
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
    const res = await fetch(authUrl, {
        method: "PUT",
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        body: JSON.stringify(profile)
    });
  
    const data = await res.json();
  
    if (data.success) {
        showToast("Profile updated!", "success");
        setProfile(prev => ({ ...prev, avatar: data.avatar }));
        localStorage.setItem("profile", profile)
    }else{
      showToast("Failed to update the profile!", "danger");
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
    if (!data.error) {
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

    </Tab>
  </Tabs>
</Card>
    </Container>
    </>

            )
    );
    }
