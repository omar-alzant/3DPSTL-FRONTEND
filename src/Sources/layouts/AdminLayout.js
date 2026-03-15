import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button, Nav } from "react-bootstrap";

import {
  BsTags,
  BsDatabaseDown,
  BsListUl,
  BsGrid,
  BsBoxes,
  BsBoxSeam,
  BsImages,
  BsCart3,
  BsChevronLeft,
  BsList,
  BsDisc,
} from "react-icons/bs";

import "../Style/AdminLayout.css";

const ADMIN_MENU = [
  { label: "Brands", path: "brands", icon: <BsTags />, activeClass: "active-brands" },
  { label: "Categories", path: "category", icon: <BsGrid />, activeClass: "active-category" },
  { label: "Types", path: "types", icon: <BsListUl />, activeClass: "active-types" },
  { label: "Models", path: "models", icon: <BsBoxes />, activeClass: "active-models" },
  { label: "Items", path: "items", icon: <BsBoxSeam />, activeClass: "active-items" },
  { label: "Carousel", path: "carousel", icon: <BsImages />, activeClass: "active-carousel" },
  { label: "Orders", path: "orders", icon: <BsCart3 />, activeClass: "active-orders" },
  { label: "Colors", path: "colors", icon: <BsDisc />, activeClass: "active-colors" },
];

function AdminLayout() {
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const isActive = (path) => location.pathname.includes(path);

  const runBackupAsync = async () => {
    const token = sessionStorage.getItem("token");
    setIsBackingUp(true);
    setProgress(10);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/backup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Backup failed");
      }

      setProgress(40);

      const blob = await res.blob();
      setProgress(80);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `3dpstl-db-${new Date().toISOString().split("T")[0]}.sql`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setProgress(100);
    } catch (err) {
      alert(err.message);
    } finally {
      setTimeout(() => {
        setIsBackingUp(false);
        setProgress(0);
      }, 800);
    }
  };

  return (
    <div className=" admin-wrapper">
      {/* Sidebar */}
      <aside className={`admin-sidebar  shadow ${isOpen ? "open" : "closed"}`}>
        <div
          onClick={toggleSidebar}
          className="cursor sidebar-header d-flex align-items-start justify-content-start px-3 py-4"
        >
          <Button variant="link" className="text-white p-0 mb-5 border-0">
            {isOpen ? <BsChevronLeft size={20} /> : <BsList size={24} />}
          </Button>
          {isOpen && <strong className="mb-0 text-white">⚙️ Admin Panel</strong>}
        </div>

        <div className="sidebar-content d-flex flex-column h-100">
          <Nav className="flex-grow-1 d-flex flex-column px-2 pt-2 gap-1">
            {ADMIN_MENU.map(({ label, path, icon, activeClass }) => (
              <Nav.Item key={path}>
                <Link
                  to={path}
                  className={`nav-link admin-nav-item d-flex align-items-center gap-3 rounded px-3 py-2 text-white ${
                    isActive(path) ? `active-link ${activeClass}` : ""
                  }`}
                >
                  <span>{icon}</span>
                  {isOpen && <span>{label}</span>}
                </Link>
              </Nav.Item>
            ))}

            {/* Backup */}
            <div className="sidebar-footer px-3 pb-3">
              <Button
                variant="outline-warning"
                className="w-100"
                onClick={runBackupAsync}
                disabled={isBackingUp}
              >
                {isBackingUp ? "Backing up..." : <><BsDatabaseDown /> {isOpen && "Backup"}</>}
              </Button>

              {isBackingUp && (
                <div className="mt-2 progress">
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    style={{ width: `${progress}%` }}
                  >
                    {progress}%
                  </div>
                </div>
              )}
            </div>
          </Nav>
        </div>
      </aside>

      {/* Main */}
      <main className={`admin-main ${isOpen ? "expanded" : "collapsed"}`}>
        <header className="content-header border-bottom py-2 px-4">
          <h4 className="fw-bold">
            Management / {location.pathname.split("/").pop()}
          </h4>
        </header>
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
