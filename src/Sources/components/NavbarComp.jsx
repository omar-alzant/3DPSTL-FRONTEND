import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Offcanvas from 'react-bootstrap/Offcanvas';
import React, { useState,  useRef } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from './Logout';
import { useCart } from '../context/CartContext';
import { Badge, Image, Overlay, Popover } from 'react-bootstrap';
import { NavLink } from "react-router-dom";
import GlobalSearch from './GlobalSearch';
import { useAuth } from '../context/AuthContext';
import CategoryMenu from './CategoryMenu';
import { CiShoppingCart } from "react-icons/ci";
import '../Style/Navbar.css'


function NavbarComp() {
  const [show, setShow] = useState(false);
  const { cart } = useCart();
  const target = useRef(null);
  const navigate = useNavigate();
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  const { email, isAdmin, profile, loading } = useAuth();
  if (loading) {
          return null; 
      }

  return (
    <div className="bg-body-h">
      {[ 'lg'].map((expand) => (
        <Navbar key={'lg'} expand={expand} className="kids-navbar">
        <Container fluid>
            <Navbar.Brand href="/">
              {/* <Image src="/logoIco.svg" height={"30px"} style={{objectFit: "cover"}}/> */}
              <Image src="/logo.png" height={"50px"} style={{objectFit: "cover"}}/>
            
            </Navbar.Brand>
            <Navbar.Toggle 
              aria-controls={`offcanvasNavbar-expand-${expand}`}
              style={{border: "none"}}
              title='Click to show navs'
              onClick={() => setShowOffcanvas(true)}            
             >
              </Navbar.Toggle>            
             
             <Navbar.Offcanvas
              show={showOffcanvas}
              onHide={() => setShowOffcanvas(false)}
              id={`offcanvasNavbar-expand-${expand}`}
              aria-labelledby={`offcanvasNavbarLabel-expand-${expand}`}
              placement="end"
            >
              <Offcanvas.Header closeButton>
                <Offcanvas.Title id={`offcanvasNavbarLabel-expand-${expand}`} className='d-flex align-items-center justify-items-between'>
                  <Image src="/logo.png" height={"30px"} style={{objectFit: "cover"}}/>
                 
                </Offcanvas.Title>

              </Offcanvas.Header>
              <Offcanvas.Body>
                <Nav className="d-flex align-content-center justify-content-center flex-grow-1 pe-3">
                  
                  <Nav.Link
                      as={NavLink}
                      onClick={() => setShowOffcanvas(false)}
                      to="/"
                      className="kids-nav-link m-1 justify-content-center align-items-center text-center"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      Home
                    </Nav.Link> 
                  {isAdmin && <Nav.Link
                    onClick={() => setShowOffcanvas(false)}

                      as={NavLink}
                      to="/admin"
                      className="kids-nav-link m-1 align-items-center justify-content-center text-center"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      Admin
                    </Nav.Link>}
                  <Nav.Link
                      as={NavLink}
                      onClick={() => setShowOffcanvas(false)}

                      to="/shop"
                      className="kids-nav-link m-1 align-items-center justify-content-center text-center"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      Shop
                    </Nav.Link>
                  <Nav.Link
                      as={NavLink}
                      onClick={() => setShowOffcanvas(false)}

                      to="/terms"
                      className="kids-nav-link m-1 align-items-center justify-content-center text-center"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      Terms
                    </Nav.Link>
                  <Nav.Link
                    as={NavLink}
                    to="/cart"
                    onClick={() => setShowOffcanvas(false)}

                    className="kids-nav-link d-flex align-items-center justify-content-center gap-2 m-1"
                  >
                    <CiShoppingCart size="1.5rem" />
                    <Badge bg="success">{cart.length}</Badge>
                  </Nav.Link>
                      <hr />
                      <div 
                  className=" m-1 text-center"
                >
                {profile ? 
                  <>
                    <Image 
                        onClick={() => setShow(!show)}
                        ref={target}
                      className='cursor kids-avatar' src={profile.avatar || '/thumbnail.png'} width={'50px'} height={'50px'} roundedCircle 
                    />
                    <Overlay
                      target={target.current}
                      show={show}
                      placement="bottom-end"
                      zIndex={9999}
                      rootClose
                      onHide={() => setShow(false)}
                    >
                      <Popover className="kids-profile-popover">
                        <Popover.Header className="kids-popover-header">
                          <div className="d-flex align-items-center gap-2">
                            <Image
                              src={profile.avatar || "/thumbnail.png"}
                              width={42}
                              height={42}
                              roundedCircle
                            />
                            <div className="text-start">
                              <div className="fw-semibold">{profile.full_name}</div>
                              <small className="text-muted">{email}</small>
                            </div>
                          </div>
                        </Popover.Header>

                        <Popover.Body className="kids-popover-body">
                          <Button
                            variant="light"
                            className="d-flex justify-content-center w-100 kids-nav-link"
                            onClick={() => {
                              navigate("/profile");
                              setShow(false);
                              setShowOffcanvas(false);
                            }}
                          >
                            My Profile
                          </Button>

                          <div className="kids-popover-divider" />

                          <LogoutButton
                            variant="danger"
                            onClose={() => {
                              setShow(false);
                              setShowOffcanvas(false);
                            }}
                          />
                        </Popover.Body>
                      </Popover>
                    </Overlay>


                  </>
                  :
                    <LogoutButton />
                  }
                </div>
                </Nav>
                <div className="d-lg-none">
                {/* <GlobalSearch onClose={() => setShowOffcanvas(false)} /> */}

                  <CategoryMenu onNavigate={() => setShowOffcanvas(false)} />
                </div>
              </Offcanvas.Body>
            </Navbar.Offcanvas>
          </Container>
        </Navbar>
      ))}
                <GlobalSearch onNavigate={() => setShowOffcanvas(false)} />

      <div className="d-none d-lg-block c-black">
          <CategoryMenu onNavigate={() => setShowOffcanvas(false)} />
      </div>

    </div>
  );
}

export default NavbarComp;